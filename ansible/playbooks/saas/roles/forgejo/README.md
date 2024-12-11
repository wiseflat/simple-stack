# Role: `forgejo`

## How to use this Ansible role?

1. In your `host_vars` directory, create a subdirectory with the name of your instance.
2. Inside this subdirectory, create a YAML file (e.g., `www.domain.com.yml`) and define the following variables:

```yaml
---
www.domain.com:
  software: forgejo           # (string) Name of the role/software being deployed.
  domain_alias: domain.com    # (string) Primary domain name for the application.
  ipfilter: []                # (list) List of allowed IPs for access control (empty for unrestricted access).
  basic_auth: False           # (bool) Enable/disable HTTP Basic Authentication (True/False).
  #login: test                # (string) Default admin login
  #password: "Simpl3St0ck"    # (string) Default admin password
  #email: test@domain.com     # (string) Default admin email