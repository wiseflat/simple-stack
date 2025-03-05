job "{{ domain }}" {
  region = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type = "service"

  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ fact_instance.location }}"
  }

  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ inventory_hostname }}"
  }

  group "{{ domain }}" {
    count = 1

    network {
      port "zigbee2mqtt" {
        to = 1883
      }
    }

    service {
      name = "{{ service_name }}"
      port = "zigbee2mqtt"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
    }

    service {
      name = "zigbee2mqtt"
      port = "zigbee2mqtt"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}"
      ]
    }

    task "{{ domain }}-zigbee2mqtt" {
      driver = "docker"

      user = "1001:1001"

      config {
        image = "koenkk/zigbee2mqtt:{{ ansible_local.software_version[software] }}"

        volumes = [
          "{{ software_path }}/app/data:/app/data:rw",
          "/run/udev:/run/udev:ro"
        ]

        group_add = [
          "dialout"
        ]

        devices = [{
          container_path = "{{ software_vars.device }}",
          host_path = "{{ software_vars.device }}"
        }]

        ports = ["zigbee2mqtt"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
