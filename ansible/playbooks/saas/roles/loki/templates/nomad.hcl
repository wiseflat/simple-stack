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
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    task "{{ domain }}-loki" {

      driver = "docker"

      config {
        image = "grafana/loki:{{ softwares.loki.version }}"
        volumes = [
          "{{ software_path }}/var/lib/loki:/var/lib/loki:rw",
          "{{ software_path }}/etc/loki:/etc/loki:ro"
        ]
        ports = ["loki"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
