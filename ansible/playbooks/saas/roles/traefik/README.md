# Role: `traefik`

## How to use this Ansible role?

1. In your `host_vars` directory, create a subdirectory with the name of your instance.
2. Inside this subdirectory, create a YAML file (e.g., `www.domain.com.yml`) and define the following variables:

```yaml
---
www.domain.com:
  software: traefik        # (string) Name of the role/software being deployed.
  email: demo@domain.com   # (string) Admin email to validate letsencrypt certificate
  size: small              # (string) Container size (small, medium, large, xl, xxl)
