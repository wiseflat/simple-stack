job "{{ domain }}" {
  region = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type = "service"

{% if software.constraints.location %}
  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ software.constraints.location }}"
  }
{% endif %}

  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ software.instance }}"
  }

  group "traefik" {

    count = 1

    restart {
      attempts = 2
      interval = "10m"
      delay = "15s"
      mode = "fail"
    }

    network {
      port "traefik_ssl_ui" {
        to = 443
        static = 443
      }
      port "traefik_ui" {
        to = 80
        static = 80
      }
    }

    service {
      name = "traefik"
      port = "traefik_ssl_ui"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}",
      ]
      check {
        name     = "traefik"
        type     = "tcp"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit = 3
          grace = "90s"
          ignore_warnings = false
        }
      }
    }

    task "traefik" {

      driver = "docker"

      config {
        image = "traefik:{{ softwares.traefik.version }}"
        network_mode = "host"
        volumes = [
          "/data/{{ domain }}:/etc/traefik",
          "/var/log/traefik:/var/log/traefik",
          "/etc/ssl/simplestack:/etc/ssl/simplestack"
        ]
        ports = ["traefik_ui", "traefik_ssl_ui"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
