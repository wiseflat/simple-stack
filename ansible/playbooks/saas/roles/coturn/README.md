# Role: `coturn`

## How to use this Ansible role?

1. In your `host_vars` directory, create a subdirectory with the name of your instance.
2. Inside this subdirectory, create a YAML file (e.g., `turn.domain.com.yml`) and define the following variables:

```yaml
turn.domain.com:
  software: coturn
  size: small
  realm: domain.com
  external_ip: 1.2.3.4
```

## Ports to open (UFW / firewall)

| Port | Protocol | Usage |
|------|----------|-------|
| 3478 | TCP/UDP | STUN/TURN |
| 49152-49252 | UDP | Media relay (configurable) |

Add the following to the host variables (`ufw_custom_rules`) of the instance where coturn is deployed:

```yaml
ufw_custom_rules:
  - port: 3478
    proto: tcp
    rule: allow
  - port: 3478
    proto: udp
    rule: allow
  - port: 49152:49252
    proto: udp
    rule: allow
```

The relay port range is configurable via:

- `min_relay_port` (default: `49152`)
- `max_relay_port` (default: `49252`)

Adjust the port range accordingly depending on the number of simultaneous calls needed (1 port = 1 relayed call).

## Secret

The `turn_shared_secret` is auto-generated and must be shared with the Synapse role to enable TURN authentication.
