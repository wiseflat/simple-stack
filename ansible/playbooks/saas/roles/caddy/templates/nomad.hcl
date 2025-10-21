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

{% if software.constraints is defined and software.constraints.instance is defined %}
  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ software.constraints.instance }}"
  }
{% endif %}

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

      template {
        change_mode = "restart"
        destination = "local/Caddyfile"
        perms = "644"
        data = <<EOH
{{ caddy_config }}
  EOH
      }

      config {
        image = "{{ docker_private_registry.url }}/caddy:{{ softwares.caddy.version }}"
        ports = ["caddy", "metrics"]
        command = "caddy"
        args  = [
          "run",
          "--config", 
          "/local/Caddyfile"
        ]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
