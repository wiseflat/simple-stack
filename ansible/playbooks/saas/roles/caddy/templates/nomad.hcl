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
    count = {{ software.scale | default(1) }}

    network {
      port "caddy" {
        to = 8080
      }
      port "metrics" {
        to = 2019
      }
    }

    service {
      name = "{{ service_name }}"
      port = "caddy"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    service {
      name = "caddy"
      port = "metrics"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}",
      ]
    }

    task "{{ domain }}-caddy" {
      driver = "docker"

      config {
        image = "{{ docker_private_registry.url }}/caddy:{{ softwares.caddy.version }}"
        volumes = [
          "{{ software_path }}/etc/caddy:/etc/caddy:ro"
        ]
        ports = ["caddy", "metrics"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
