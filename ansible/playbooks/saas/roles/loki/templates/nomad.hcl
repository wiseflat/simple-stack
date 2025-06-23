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
      port "loki" {
        to = 3100
      }
    }

    service {
      name = "{{ service_name }}"
      port = "loki"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}"{% if not loop.last %},{% endif %}{% endfor %}]
    }

    task "{{ domain }}-loki" {

      driver = "docker"

      config {
        image = "grafana/loki:{{ hostvars[inventory_hostname].softwares.loki }}"
        volumes = [
          "{{ software_path }}/var/lib/loki:/var/lib/loki:rw",
          "{{ software_path }}/etc/loki:/etc/loki:ro"
        ]
        ports = ["loki"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
