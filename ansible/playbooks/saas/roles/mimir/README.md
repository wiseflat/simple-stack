# Role: `mimir`

## How to use this Ansible role?

1. In your `host_vars` directory, create a subdirectory with the name of your instance.
2. Inside this subdirectory, create a YAML file (e.g., `www.domain.com.yml`) and define the following variables:

```yaml
---
www.domain.com:
  software: mimir         # (string) Name of the role/software being deployed.
  domain_alias: domain.com    # (string) Primary domain name for the application.
  ipfilter: []                # (list) List of allowed IPs for access control (empty for unrestricted access).
  basic_auth: False           # (bool) Enable/disable HTTP Basic Authentication (True/False).
```

# Configure alertmanager

If you want to send alertmanager alert to a custom receiver, add a secret to your domain in the UI:

```
alertmanager:
  receivers:
    - name: default
      webhook_configs:
        - url: https://www.myreceiver.com/api/webhook/<secret-path>
          send_resolved: true
```