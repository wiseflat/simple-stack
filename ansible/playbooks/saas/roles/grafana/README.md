# Role: `grafana`

## How to use this Ansible role?

1. In your `host_vars` directory, create a subdirectory with the name of your instance.
2. Inside this subdirectory, create a YAML file (e.g., `www.domain.com.yml`) and define the following variables:

```yaml
---
www.domain.com:
  software: grafana         # (string) Name of the role/software being deployed.
  domain_alias: domain.com    # (string) Primary domain name for the application.
  ipfilter: []                # (list) List of allowed IPs for access control (empty for unrestricted access).
  basic_auth: False           # (bool) Enable/disable HTTP Basic Authentication (True/False).
```

## variable

```yaml
passwd: s3cret!
user: myuser
```

## Secret

```yaml
plugins:
  - disabled: false
    jsonData:
      models:
        default: base
        mapping:
          base: gpt-oss-120b
          large: gpt-oss-120b
      openAI:
        apiPath: /api/openai_compat/v1
        url: https://llm.public.api
      provider: custom
      vector:
        embed:
          grafanaVectorAPI:
            authType: no-auth
            url: http://vectorStore.default.service.nomad:8687
          type: grafana/vectorapi
        enabled: true
        model: BAAI/bge-small-en-v1.5
        store:
          grafanaVectorAPI:
            authType: no-auth
            url: http://vectorStore.default.service.nomad:8687
          type: grafana/vectorapi
    secureJsonData:
      openAIKey: <secretkey>
    type: grafana-llm-app
```