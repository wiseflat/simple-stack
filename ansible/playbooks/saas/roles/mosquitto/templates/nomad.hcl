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
      port "mosquitto" {
        to = 1883
        static = 1883
      }
    }

    service {
      name = "{{ service_name }}"
      port = "mosquitto"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
    }

    service {
      name = "mosquitto"
      port = "mosquitto"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}"
      ]
    }

    task "{{ domain }}-mosquitto" {
      driver = "docker"

      env {
        CRON_MIN = "*/15"
        TZ = "Europe/Paris"
      }

      config {
        image = "eclipse-mosquitto:{{ hostvars[inventory_hostname].softwares.mosquitto }}"

        volumes = [
          "{{ software_path }}/mosquitto/config:/mosquitto/config:rw",
          "{{ software_path }}/mosquitto/data:/mosquitto/data:rw",
          "{{ software_path }}/mosquitto/log:/mosquitto/log:rw"
        ]
        ports = ["mosquitto"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
