# Role: `synapse`

## How to use this Ansible role?

1. In your `host_vars` directory, create a subdirectory with the name of your instance.
2. Inside this subdirectory, create a YAML file (e.g., `synapse.domain.com.yml`) and define the following variables:

```yaml
synapse.domain.com:
  software: matrix
  size: small
  server_name: domain.com
  element_domain: chat.domain.com
  db_host: 127.0.0.1
  db_port: 5432
  turn_domain: turn.domain.com
  cache_host: 127.0.0.1
  cache_port: 6379
```

## Secrets

```yaml
db_password: s3cret
registration_shared_secret: auto-generated
macaroon_secret_key: auto-generated
form_secret: auto-generated
turn_shared_secret: shared-with-coturn
```

## User management

### Create an admin account

```bash
docker exec -it synapse register_new_matrix_user \
  http://localhost:8008 \
  -c /local/homeserver.yaml \
  -u admin -p monmotdepasse -a
```

### Create a standard user account

```bash
docker exec -it synapse register_new_matrix_user \
  http://localhost:8008 \
  -c /local/homeserver.yaml \
  -u utilisateur -p sonmotdepasse
```

> The `-a` flag grants admin privileges. Omit it for a regular user.
