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
    count = {{ software_vars.scale | default(1) }}

    network {
      port "apache" {
        to = 80
      }
    }

    service {
      name = "{{ service_name }}"
      port = "apache"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
      check {
        name     = "{{ service_name }}"
        type     = "http"
        path     = "/"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit = 3
          grace = "90s"
          ignore_warnings = false
        }
      }
    }

    task "{{ domain }}-apache" {
      driver = "docker"

      env {
        CRON_MIN = "*/15"
        TZ = "Europe/Paris"
      }

      config {
        image = "{{ software }}/{{ software }}:{{ ansible_local.software_version[software] }}"
        volumes = [
          "/data/{{ domain }}/data:/var/www/FreshRSS/data:rw",
          "/data/{{ domain }}/extensions:/var/www/FreshRSS/extensions:rw"
        ]
        ports = ["apache"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
        memory_max = {{ size[software_vars.size].memory * 2 }}
      }
    }
  }
}
