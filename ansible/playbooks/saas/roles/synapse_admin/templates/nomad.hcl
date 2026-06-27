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

  group "synapse-admin" {

    count = 1

    restart {
      attempts = 2
      interval = "10m"
      delay    = "15s"
      mode     = "fail"
    }

    network {
      port "http" {
        to = 80
      }
    }

    service {
      name     = "{{ service_name }}"
      port     = "http"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
      # check {
      #   name     = "{{ service_name }}"
      #   type     = "http"
      #   path     = "/"
      #   interval = "60s"
      #   timeout  = "30s"
      #   check_restart {
      #     limit           = 3
      #     grace           = "90s"
      #     ignore_warnings = false
      #   }
      # }
    }

    task "{{ domain }}-synapse-admin" {

      driver = "docker"

      env {
        SYNAPSE_URL = "https://{{ software.domain }}"
      }

      config {
        image = "etkecc/synapse-admin:v{{ catalogs.synapse_admin.version }}"
        ports = ["http"]
        volumes = [
          "local/config.json:/app/config.json:ro"
        ]
      }

      template {
        change_mode = "restart"
        destination = "local/config.json"
        data        = <<EOH
{{ lookup('ansible.builtin.template', 'templates/config.json.j2') }}
  EOH
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory | int }}
      }
    }
  }
}
