# Role: `matrix_migrate`

Migrate data from a Rocket.Chat instance (MongoDB) to a Synapse/Matrix instance.
Uses [verdigado/rocketchat2matrix](https://github.com/verdigado/rocketchat2matrix) (TypeScript/Node.js).

## Prerequisites

### 1. Export Rocket.Chat data from MongoDB

The tool reads from JSON exports (not directly from MongoDB). Export on the RC server:

```bash
mongoexport --host <rc_mongo_host> --port <rc_mongo_port> --collection=rocketchat_message --db=parties --out=rocketchat_message.json
mongoexport --host <rc_mongo_host> --port <rc_mongo_port> --collection=rocketchat_room --db=parties --out=rocketchat_room.json
mongoexport --host <rc_mongo_host> --port <rc_mongo_port> --collection=users --db=parties --out=users.json
```

Place these files in `{{ software_path }}/inputs/` on the target instance.

### 2. Synapse (target)

- Synapse must be running with PostgreSQL
- An admin account must exist on Synapse
- **Disable rate limiting** temporarily in `homeserver.yaml` for migration:

```yaml
rc_joins:
  local:
    per_second: 1024
    burst_count: 2048
rc_joins_per_room:
  per_second: 1024
  burst_count: 2048
rc_message:
  per_second: 1024
  burst_count: 2048
rc_invites:
  per_room:
    per_second: 1024
    burst_count: 2048
  per_user:
    per_second: 1024
    burst_count: 2048
  per_issuer:
    per_second: 1024
    burst_count: 2048
```

- **Register an Application Service** by adding to `homeserver.yaml`:

```yaml
app_service_config_files:
  - /data/app-service.yaml
```

### 3. Network

The migration container must be able to reach:

- Synapse API (port 8008 or via public domain)

## Step-by-step procedure

### Step 1: Create an admin account on Synapse

```bash
docker exec -it synapse register_new_matrix_user \
  http://localhost:8008 \
  -c /data/homeserver.yaml \
  -u admin -p monmotdepasse -a
```

### Step 2: Export Rocket.Chat data

```bash
mongosh --eval "db = db.getSiblingDB('parties'); db.rocketchat_message.countDocuments({})"
```

Expected output: a number > 0 (e.g. `188819`).

Then export:

```bash
mongoexport --collection=rocketchat_message --db=parties --out=rocketchat_message.json
mongoexport --collection=rocketchat_room --db=parties --out=rocketchat_room.json
mongoexport --collection=users --db=parties --out=users.json
```

### Step 3: Place export files on the instance

Copy the JSON files to `{{ software_path }}/inputs/` on the host where the migration job will run.

### Step 4: Verify Synapse admin API

```bash
curl -X POST "https://matrix.domain.com/_matrix/client/r0/login" \
  -H "Content-Type: application/json" \
  -d '{"type": "m.login.password", "user": "admin", "password": "monmotdepasse"}'
```

### Step 5: Backup before migration

```bash
# Backup Synapse PostgreSQL
pg_dump -h <pg_host> -U synapse synapse > /var/backup/synapse.sql
```

### Step 6: Run the migration

Configure the following software variables:

```yaml
migrate.domain.com:
  software: matrix_migrate
  size: medium
  matrix_domain: matrix.domain.com
  matrix_admin_user: admin
```

Secret:

```yaml
matrix_admin_password: monmotdepasse
```

The migration job runs as a Nomad batch job (one-shot). Monitor progress via Nomad logs.

### Step 7: Post-migration

- Remove rate limiting overrides from `homeserver.yaml`
- Restart Synapse

## Checklist

- [ ] MongoDB data exported to JSON files
- [ ] JSON files placed in `{{ software_path }}/inputs/`
- [ ] Synapse running with PostgreSQL
- [ ] Admin account created on Synapse
- [ ] Rate limiting disabled temporarily
- [ ] Application Service configured
- [ ] Synapse PostgreSQL backup done
- [ ] Migration job executed successfully
- [ ] Rate limiting re-enabled post-migration
