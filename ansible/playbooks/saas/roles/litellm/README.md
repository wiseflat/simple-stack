# Role: `litellm`

## variable

```yaml
litellm_dbhost: postgresql
litellm_config:
  general_settings:
    store_model_in_db: true
    supported_db_objects:
      - mcp
  litellm_settings:
    drop_params: true
  mcp_servers:
    news_mcp:
      description: My MCP description
      transport: http
      url: http://192.168.0.46:8001/mcp
  model_list:
    - litellm_params:
        api_key: os.environ/OVHCLOUD_API_KEY
        model: ovhcloud/gpt-oss-120b
      model_name: ovhcloud/gpt-oss-120b
    - litellm_params:
        api_key: os.environ/OVHCLOUD_API_KEY
        model: ovhcloud/bge-multilingual-gemma2
      model_name: ovhcloud/bge-multilingual-gemma2
    - litellm_params:
        api_key: os.environ/OVHCLOUD_API_KEY
        model: ovhcloud/Deepseek-R1-Distill-Llama-70B
      model_name: ovhcloud/Deepseek-R1-Distill-Llama-70B
    - litellm_params:
        api_key: os.environ/OVHCLOUD_API_KEY
        model: ovhcloud/BGE-M3
      model_name: ovhcloud/BGE-M3
```

## Secret

```yaml
litellm_dbpasswd: 123456
litellm_env:
  - key: LITELLM_MASTER_KEY
    value: sk-123456789
  - key: LITELLM_SALT_KEY
    value: sk-12345678-123456789-12345678
  - key: DATABASE_URL
    value: postgresql://user:passwd@postgresql.default.service.nomad:5432/litellm
  - key: STORE_MODEL_IN_DB
    value: true
  - key: OVHCLOUD_API_KEY
    value: APIKEY
```