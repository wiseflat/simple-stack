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
          "{{ software_path }}/var/lib/loki:/var/lib/loki:rw"
        ]
        args = [
          "-config.file",
          "/local/config.yaml"
        ]
        ports = ["loki"]
      }

      template {
        change_mode = "restart"
        destination = "local/config.yaml"
        data = <<EOH
{{ lookup('ansible.builtin.template', 'templates/config.yaml.j2') }}
  EOH
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
