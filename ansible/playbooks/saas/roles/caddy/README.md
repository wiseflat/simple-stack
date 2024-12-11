# Role: `caddy`

## How to use this Ansible role?

1. In your `host_vars` directory, create a subdirectory with the name of your instance.
2. Inside this subdirectory, create a YAML file (e.g., `www.domain.com.yml`) and define the following variables:

```yaml
---
www.domain.com:
  software: caddy          # (string) Name of the role/software being deployed.
  domain_alias: domain.com # (string) Primary domain name for the application.
  ipfilter: []             # (list) List of allowed IPs for access control (empty for unrestricted access).
  basic_auth: False        # (bool) Enable/disable HTTP Basic Authentication (True/False).
  config: |                # (raw) Caddy configuration
    :8080
    respond "Hello world!"
  scale:                   # (Object) Number of docker container to load balance http traffic
    caddy:
      - id: 1              # (int) Container suffix id
        state: started     # (string) [absent|present|healthy|started|stopped] container status
