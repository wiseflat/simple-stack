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
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_IMAGE)

deploy:
	@echo "Deploy (or redeploy) a software"
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_DEPLOY)

operate:
	@echo "Operate on a software"
	cd $(ANSIBLE_DIR) && ansible-playbook $(PLAYBOOK_OPERATE)

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
