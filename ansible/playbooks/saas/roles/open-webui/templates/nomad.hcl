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

  group "open-webui" {
    count = 1

    network {
      port "open-webui" {
        to = 8080
      }

      port "valkey" {
        to = 6379
        host_network = "internal"
      }
    }

    service {
      name = "{{ service_name }}"
      port = "open-webui"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    task "open-webui" {
      driver = "docker"

      env {
        ENABLE_WEBSOCKET_SUPPORT = true
        WEBSOCKET_MANAGER = redis
        WEBSOCKET_REDIS_URL = "redis://${NOMAD_ADDR_valkey}/1"
      }

      config {
        image = "ghcr.io/open-webui/open-webui:{{ softwares.open-webui.version }}"

        mount {
          type = "bind"
          target = "/app/backend/data"
          source = "{{ software_path }}/app/backend/data"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }
        ports = ["open-webui"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }

    task "valkey" {
      driver = "docker"

      env {
        VALKEY_EXTRA_FLAGS = "--save 60 1"
      }

      config {
        image = "docker.io/valkey/valkey:{{ valkey_version }}"

        mount {
          type = "bind"
          target = "/data"
          source = "{{ software_path }}/data"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }

        ports = ["valkey"]
      }

      resources {
        cpu    = 128
        memory = 128
      }
    }
  }
}
