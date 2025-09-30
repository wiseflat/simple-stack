# Role: `adguard`

## How to use this Ansible role?

1. In your `host_vars` directory, create a subdirectory with the name of your instance.
2. Inside this subdirectory, create a YAML file (e.g., `www.domain.com.yml`) and define the following variables:

```yaml
---
www.domain.com:
  software: adguard
  config:
    users:
      - name: test
        password: "your password"
    dns:
      bind_hosts:
        - 192.168.1.1
    http:
      pprof:
        port: 6060
        enabled: false
      address: 192.168.1.1:8080
      session_ttl: 720h
    dhcp:
      enabled: true
      interface_name: eno1
      local_domain_name: lan
      dhcpv4:
        gateway_ip: 192.168.1.1
        subnet_mask: 255.255.255.0
        range_start: 192.168.1.10
        range_end: 192.168.1.200
        lease_duration: 86400
        icmp_timeout_msec: 1000
        options:
          - 6 ip 192.168.1.1
    filters: []
    whitelist_filters: []
  scale: 1
