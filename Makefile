PWD := $(shell pwd)
TERRAFORM_DIR := $(PWD)/terraform
ANSIBLE_DIR := $(PWD)/ansible
SSH_KEY := $(ANSIBLE_DIR)/ssh/key
TF_VARS_FILE := $(TERRAFORM_DIR)/variables.tfvars
PLAYBOOK_PAAS := $(ANSIBLE_DIR)/playbooks/paas/main.yml
PLAYBOOK_IMAGE := $(ANSIBLE_DIR)/playbooks/saas/image.yml
PLAYBOOK_DEPLOY := $(ANSIBLE_DIR)/playbooks/saas/main.yml
PLAYBOOK_OPERATE := $(ANSIBLE_DIR)/playbooks/saas/operate.yml

.PHONY: all init terraform-init ansible-init check-vars check-ssh

all: init

init: terraform-init ansible-init

terraform-init: check-ssh check-vars
	@echo "Initializing Terraform..."
	cd $(TERRAFORM_DIR) && terraform init
	cd $(TERRAFORM_DIR) && terraform apply --var-file=$(TF_VARS_FILE)

ansible-init:
	@echo "Installing Ansible collections..."
	cd $(ANSIBLE_DIR) && ansible-galaxy collection install -r requirements.yml -p ./collections
	@echo "Running Ansible playbook..."
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_PAAS)
	cd $(ANSIBLE_DIR) && mkdir group_vars host_vars

image:
	@echo "Build a new docker image"
	@echo "Software name: $(software)"
	@if [ -z "$(software)" ]; then \
		echo "Error: You must specify a software name using 'make image software=<name>'"; \
		exit 1; \
	fi
	@echo "Instance name: $(instance)"
	@if [ -z "$(instance)" ]; then \
		echo "Error: You must specify an instance name using 'make image instance=<name>'"; \
		exit 1; \
	fi
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_IMAGE) -e "software=$(software)"  -l ${instance}

deploy:
	@echo "Deploy (or redeploy) a software"
	@echo "Instance name: $(instance)"
	@if [ -z "$(instance)" ]; then \
		echo "Error: You must specify an instance name using 'make deploy instance=<name>'"; \
		exit 1; \
	fi
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_DEPLOY) -l ${instance}

operate:
	@echo "Operate on a software"
	@echo "Domain name: $(domain)"
	@if [ -z "$(domain)" ]; then \
		echo "Error: You must specify a domain name using 'make operate domain=<name>'"; \
		exit 1; \
	fi
	@echo "Software name: $(software)"
	@if [ -z "$(software)" ]; then \
		echo "Error: You must specify a software name using 'make operate software=<name>'"; \
		exit 1; \
	fi
	@echo "Instance name: $(instance)"
	@if [ -z "$(instance)" ]; then \
		echo "Error: You must specify an instance name using 'make operate instance=<name>'"; \
		exit 1; \
	fi
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_OPERATE) -e "domain=$(domain)" -e "software=$(software)" -l ${instance}

check-ssh:
	@echo "Checking SSH key..."
	@if [ ! -f $(SSH_KEY) ]; then \
		echo "SSH key not found. Generating a new one..."; \
		ssh-keygen -t rsa -b 4096 -P '' -f $(SSH_KEY); \
	else \
		echo "SSH key already exists. Skipping generation."; \
	fi

check-vars:
	@echo "Checking Terraform variable file..."
	@if [ ! -f $(TF_VARS_FILE) ]; then \
		echo "Error: Terraform variable file '$(TF_VARS_FILE)' not found!"; \
		exit 1; \
	fi

ansible-test-deploy: image
	@echo "Testing a software lifecycle with Ansible"
	@echo "Domain name: $(domain)"
	@if [ -z "$(domain)" ]; then \
		echo "Error: You must specify a domain name using 'make ansible-test domain=<name>'"; \
		exit 1; \
	fi
	@echo "Software name: $(software)"
	@if [ -z "$(software)" ]; then \
		echo "Error: You must specify a software name using 'make ansible-test software=<name>'"; \
		exit 1; \
	fi
	@echo "Instance name: $(instance)"
	@if [ -z "$(instance)" ]; then \
		echo "Error: You must specify an instance name using 'make ansible-test instance=<name>'"; \
		exit 1; \
	fi
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_DEPLOY) -e "domain=$(domain)" -e "software=$(software)" -e "confirmation=yes" -l ${instance}
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_OPERATE) -e "domain=$(domain)" -e "software=$(software)" -e "task=backup" -l ${instance}
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_OPERATE) -e "domain=$(domain)" -e "software=$(software)" -e "task=restore" -l ${instance}

ansible-test-destroy:
	@echo "Testing a software lifecycle with Ansible"
	@echo "Domain name: $(domain)"
	@if [ -z "$(domain)" ]; then \
		echo "Error: You must specify a domain name using 'make ansible-test domain=<name>'"; \
		exit 1; \
	fi
	@echo "Software name: $(software)"
	@if [ -z "$(software)" ]; then \
		echo "Error: You must specify a software name using 'make ansible-test software=<name>'"; \
		exit 1; \
	fi
	@echo "Instance name: $(instance)"
	@if [ -z "$(instance)" ]; then \
		echo "Error: You must specify an instance name using 'make ansible-test instance=<name>'"; \
		exit 1; \
	fi
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_OPERATE) -e "domain=$(domain)" -e "software=$(software)" -e "task=destroy" -l ${instance}
