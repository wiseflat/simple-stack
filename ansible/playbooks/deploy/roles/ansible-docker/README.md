README
# Description
Install [Docker](https://www.docker.com/) and Docker-Compose from official repository

## How role works (summary)
Ansible will:
* Adds official repository
* Installs Docker and Docker-Compose

If `docker_tls_configuration` is set to true, Ansible will generate certificates and change from unix socket to TCP

&nbsp;

# Requirements

## System
* Ubuntu 20.04 +

And with surprise! Ansible [core 2.14.1]

## Ansible

&nbsp;
# Playbook deploy minimal example

```
- name: Installation Docker
  hosts: $HOST
  become: yes
  tasks:
    - name: Install Docker
      ansible.builtin.import_role:
        name: hashistack.docker.install
```
