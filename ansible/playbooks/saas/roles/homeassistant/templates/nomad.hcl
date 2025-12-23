job "{{ domain }}" {
  region = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type = "service"

{% if software.constraints is defined and software.constraints.location is defined %}
  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ software.constraints.location }}"
  }
{% endif %}

  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ software.instance }}"
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
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
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
        image = "homeassistant/home-assistant:{{ softwares.homeassistant.version }}"

        privileged = "true"
        volumes = [
          "/data/{{ domain }}/config:/config:rw",
          "/run/dbus:/run/dbus:ro"
        ]

        cap_add = ["net_admin", "net_raw"]

        ports = ["homeassistant"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
