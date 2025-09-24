# Role: `scan_exporter`

In this configuration scan_exporter service is installed on all instances in your inventory.
Every instances scan each others.

## How to use this Ansible role?

An instance can have few open ports. Add this variable on your inventory host_name to check specific ports:

```yaml
scan_exporter_tcp_expected: "22,80,443"
```
