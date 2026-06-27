job "{{ domain }}" {
  region      = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type        = "service"

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

  group "synapse" {

    count = 1

    restart {
      attempts = 2
      interval = "10m"
      delay    = "15s"
      mode     = "fail"
    }

    network {
      port "synapse" {
        to = 8008
      }
    }

    service {
      name     = "{{ service_name }}"
      port     = "synapse"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
      check {
        name     = "{{ service_name }}"
        type     = "http"
        path     = "/health"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit           = 3
          grace           = "90s"
          ignore_warnings = false
        }
      }
    }

    task "{{ domain }}-synapse" {

      driver = "docker"

      env {
        SYNAPSE_CONFIG_PATH = "/local/homeserver.yaml"
      }

      config {
        image = "matrixdotorg/synapse:v{{ catalogs.synapse.version }}"
        ports = ["synapse"]
        volumes = [
          "{{ software_path }}/data:/data:rw"
        ]
      }

      template {
        change_mode = "restart"
        destination = "local/homeserver.yaml"
        data        = <<EOH
{{ lookup('ansible.builtin.template', 'templates/homeserver.yaml.j2') }}
  EOH
      }

      template {
        change_mode = "restart"
        destination = "local/log.config"
        data        = <<EOH
{{ lookup('ansible.builtin.template', 'templates/log.config.j2') }}
  EOH
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory | int }}
      }
    }
  }
}
