README
# Description
Deploy Nomad from Hashicorp: [Nomad](https://nomadproject.io)

## How role works (summary)
Ansible will:
- Generate TLS Certs
- Install Nomad
- Add configuration for docker/podman/vault
- Create ACL
- Will write on PasswordStore host credentials

&nbsp;

# Requirements

## System
* Ubuntu 20.04 +

And with surprise! Ansible [core 2.14.1]

&nbsp;
# Vars

## defaults/main.yml
&nbsp;
### General
| var | default | note |
| --- | --- | --- |
| nomad\_install\_http\_scheme |  "https" | Self-explanatory |
| nomad\_install\_http\_ip |  "127.0.0.1" | Self-explanatory |
| nomad\_install\_http\_port |  "4646" | Self-explanatory |
| check\_online\_version |  true | If needed to check on Hashicorp website before install |
| nomad\_config\_dir |  "/etc/nomad.d" | Self-explanatory |
| nomad\_install\_dc\_name |  "dc1" | Self-explanatory |
&nbsp;
### Plugins
| var | default | note |
| --- | --- | --- |
| nomad\_docker\_driver | true | Does install docker? (recommanded) |
| nomad\_podman\_driver | false | Does install podman? |
| nomad\_raw\_exec\_driver | false | Does install raw_exec (dangerous) |
| podman\_rootless | true | Install podman in rootless (somes issues curently with nomad) |

&nbsp;
# UI Access
| var | default | note |
| --- | --- | --- |
| nomad\_ui\_access | cloud | Where to access to Nomad UI, cloud | onpremise  |
| nomad\_url | "nomad.{{ inventory_hostname }}" | url to access to Nomad UI |
| nomad\_http\_auth | "true" | Enable basic auth |
| nomad\_http\_auth\_user | nomad | Basic Auth |
| nomad\_http\_auth\_password | "{{ lookup('ansible.builtin.password', '/dev/null') }}" | Generate random password |
| nomad\_install\_verify\_https\_client | "false" | Access to http interface not verifying TLS cert to enable access |

&nbsp;
### TLS
| var | default | note |
| --- | --- | --- |
| nomad\_install\_tls\_ca\_host | localhost | Which host will use to generate CA authority |
| nomad\_install\_tls\_ca\_host\_dir |  "\{\{ project\_dir \}\}/env/host\_vars/\{\{ inventory\_hostname \}\}/tls" | Where to put CA keys |
| nomad\_install\_tls\_ca\_pubkey |  "hashistack-ca.pem" | Name of CA cerficate |
| nomad\_install\_tls\_ca\_privatekey |  "hashistack-ca-key.pem" | Name of CA private key |
| nomad\_install\_tls\_ca\_provider |  "ownca" | Which type of CA will use to create cert (don't change) |
| nomad\_install\_tls\_host\_certificate\_dir |  "/etc/ssl/hashistack" | Where to put CA pubey on target host |
| nomad\_install\_tls\_cert |  "\{\{ nomad\_install\_dc\_name \}\}-server-consul.pem" | Name of Consul TLS Cert |
| nomad\_install\_tls\_privatekey |  "\{\{ nomad\_install\_dc\_name \}\}-server-consul.key" | Name of Consul TLS Private key |
| nomad\_install\_tls\_common\_name |  "*.\{\{ nomad\_install\_dc\_name \}\}.consul" | Common name for CSR |
| nomad\_install\_tls\_subject\_alt\_name |  "DNS:localhost,IP:127.0.0.1,DNS:server.global.nomad,DNS:server.{{ nomad_install_dc_name }}.nomad" | Subject Alt Name for CSR , caution: DNS:server.global.nomad is mandatory|

&nbsp;
### Consul
| var | default | note |
| --- | --- | --- |
| nomad_install_backend_consul_http_scheme | "https" | HTTP scheme of Consul backend |
| nomad_install_backend_consul_http_ip | "127.0.0.1" | ip of Consul backend |
| nomad_install_backend_consul_http_port | 8501 | Port of Consul backend |
| nomad_install_backend_consul_tls_cert | "{{ nomad_install_dc_name }}-server-consul.pem" | Cert to use in TLS mode |
| nomad_install_backend_consul_tls_privatekey | "{{ nomad_install_dc_name }}-server-consul.key" | Key to use in TLS mode |
| nomad_install_consul_service_address |  172.17.0.1 | IP to register service (nomad UI) |

&nbsp;
### Vault
| var | default | note |
| --- | --- | --- |
| nomad_install_backend_vault_http_scheme  |  "https" | HTTP scheme of Vault backend |
| nomad_install_backend_vault_http_ip |  "127.0.0.1" | IP of Vault backend |
| nomad_install_backend_vault_http_port |  8200 | Port of Vault backend |
| nomad_install_vault_create_from_role |  "nomad-cluster" | Role previouly create in vault installation to use to nomad |
| nomad_install_vault_tls_cert |  "{{ nomad_install_dc_name }}-server-vault.pem" | Cert to use in TLS mode |
| nomad_install_vault_tls_privatekey |  "{{ nomad_install_dc_name }}-server-vault.key" | Key to use in TLS mode |
