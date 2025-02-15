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

  group "openwebui" {
    count = 1

    network {
      port "openwebui" {
        to = 8080
      }
    }

    service {
      name = "{{ service_name }}"
      port = "openwebui"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
    }

    task "openwebui" {
      driver = "docker"

      env {
        ENABLE_WEBSOCKET_SUPPORT = true
        WEBSOCKET_MANAGER = redis
        WEBSOCKET_REDIS_URL = redis://{% raw %}{{ env NOMAD_ADDR_valkey }}{% endraw %}:6379/1
      }

      config {
        image = "{{ software }}/open-webui:{{ ansible_local.software_version[software] }}"

        mount {
          type = "bind"
          target = "/app/backend/data"
          source = "{{ software_path }}/app/backend/data"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }

  group "valkey" {

    count = 1

    network {
      mode = "bridge"

      port "valkey" {
        to = 6379
        static = 6379
        host_network = "internal"
      }
    }

    service {
      name = "valkey"
      port = "valkey"
			provider = "nomad"
    }

    task "valkey" {
      driver = "docker"

      config {
        image = "valkey/valkey:latest"

        command = 'valkey-server --save 30 1'

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
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
