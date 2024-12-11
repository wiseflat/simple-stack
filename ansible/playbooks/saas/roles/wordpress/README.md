# Role: `wordpress`

## How to use this Ansible role?

1. In your `host_vars` directory, create a subdirectory with the name of your instance.
2. Inside this subdirectory, create a YAML file (e.g., `www.domain.com.yml`) and define the following variables:

```yaml
---
www.domain.com:
  software: wordpress         # (string) Name of the role/software being deployed.
  domain_alias: domain.com    # (string) Primary domain name for the application.
  ipfilter: []                # (list) List of allowed IPs for access control (empty for unrestricted access).
  basic_auth: False           # (bool) Enable/disable HTTP Basic Authentication (True/False).
  dbhost: mariadb.domain.com  # (string) Hostname of the database server.
  scale:                      # (Object) Number of docker container to load balance http traffic
    nginx:
      - id: 1                 # (int) Container suffix id
        state: started        # (string) [absent|present|healthy|started|stopped] container status
        php_socket: 2         # (int) Number of phpfpm sockets described below
    phpfpm:
      - id: 1
        state: started
      - id: 2
        state: started
