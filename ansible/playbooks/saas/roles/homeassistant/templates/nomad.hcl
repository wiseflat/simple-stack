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
      port "homeassistant" {
        to = 8123
        # static = 8213
      }
    }

    service {
      name = "{{ service_name }}"
      port = "homeassistant"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
      # check {
      #   name     = "{{ service_name }}"
      #   type     = "http"
      #   path     = "/"
      #   interval = "60s"
      #   timeout  = "30s"
      #   check_restart {
      #     limit = 3
      #     grace = "90s"
      #     ignore_warnings = false
      #   }
      # }
    }

    # prometheus
    service {
      name = "homeassistant"
      port = "homeassistant"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}"
      ]
    }

    task "{{ domain }}-homeassistant" {
      driver = "docker"

      env {
        TZ = "Europe/Paris"
      }

      config {
        image = "{{ software }}/home-assistant:{{ ansible_local.software_version[software] }}"

        volumes = [
          "/data/{{ domain }}/config:/config:rw"
        ]
        ports = ["homeassistant"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
