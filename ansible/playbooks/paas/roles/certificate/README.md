README
# Description
Certificate TLS:
- Create Certificate Authority
- Create cert client according to Certificate Authority

## How role works (summary)
Ansible will create CA on Ansible controller with tasks `ca.yml` or/and create certificate for client with `client.yml`. It will use pipe for CSR and Cert creation before create on target server the cert and key.

&nbsp;
# Requirements

## System
* Ubuntu 20.04 +

And with surprise! Ansible [core 2.14.1]

&nbsp;
# Playbook deploy minimal example

For CA:

```
- name: Create Certificate Authority
  hosts: $HOST
  become: yes
  tasks:
    - name: Certificate | TLS Configuration
      ansible.builtin.import_role:
        name: certificate
        tasks_from: ca
      vars:
        ca_host: localhost
        ca_host_dir: "/path/on/ansible/controller"
        ca_pubkey: "certificate-ca.pem"
        ca_privatekey: "certificate-ca-key.pem"
        host_certificate_dir: "/path/on/target"
        common_name: "certificate"
```

For client:

```
- name: Create Certificate Client
  hosts: $HOST
  become: yes
  tasks:
    - name: Certificate | Client TLS Configuration
      ansible.builtin.import_role:
        name: certificate
        tasks_from: client
      vars:
        host_certificate_dir: "/path/on/target"
        ca_host_dir: "/path/on/ansible/controller"
        ca_pubkey: "certificate-ca.pem"
        ca_privatekey: "certificate-ca-key.pem"
        ca_provider: "ownca"
        ca_host: localhost
        cert: "name-server.pem"
        client_privatekey: "name-server-key.pem"
        common_name: "certificate"
        subject_alt_name: "DNS:localhost,IP:127.0.0.1"

```

# Vars

## defaults/main.yml

### Roles vars

| var | default | note |
| --- | --- | --- |
| app\_name | certificate | Self-explanatory |
| role\_user | root | user for ansible specifics tasks |

&nbsp;
### certificate info
| var | default | note |
| --- | --- | --- |
| ca_host | localhost | Where CA will be create (delegate_to) |
| ca_host_dir | /etc/tls | Path on ansible controler  |
| ca_pubkey | "certificate-ca.pem" | Self-explanatory |
| ca_privatekey | "certificate-ca-key.pem" | Self-explanatory |
| host_certificate_dir | "/etc/ssl/certificate" | Path on target for TLS |
| cert | "certificate-server.pem" | Self-explanatory |
| privatekey | "certificate-server.key" | Self-explanatory |
| common_name | "certificate" | The commonName field of the certificate signing request subject |
| subject_alt_name | "DNS:localhost,IP:127.0.0.1,DNS:server.dc1.consul" | Subject Alternative Name (SAN) extension to attach to the certificate signing request |
