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
      port "http" {
        to = 8080
      }
      port "zigbee2mqtt" {
        to = 1883
      }
    }

    service {
      name = "{{ service_name }}"
      port = "zigbee2mqtt"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
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
        image = "koenkk/zigbee2mqtt:{{ hostvars[inventory_hostname].softwares.zigbee2mqtt }}"

        volumes = [
          "{{ software_path }}/app/data:/app/data:rw",
          "/run/udev:/run/udev:ro"
        ]

        group_add = [
          "dialout"
        ]

        devices = [{
          container_path = "{{ software_vars.config.device }}",
          host_path = "{{ software_vars.config.device }}"
        }]

        ports = ["http", "zigbee2mqtt"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
