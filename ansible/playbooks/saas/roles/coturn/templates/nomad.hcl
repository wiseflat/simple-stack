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

  group "coturn" {

    count = 1

    restart {
      attempts = 2
      interval = "10m"
      delay    = "15s"
      mode     = "fail"
    }

    network {
      port "stun" {
        static = 3478
        to     = 3478
      }
    }

    service {
      name     = "{{ service_name }}"
      port     = "stun"
      provider = "nomad"
      tags     = []
      check {
        name     = "{{ service_name }}"
        type     = "tcp"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit           = 3
          grace           = "90s"
          ignore_warnings = false
        }
      }
    }

    task "{{ domain }}-coturn" {

      driver = "docker"

      config {
        image        = "coturn/coturn:{{ catalogs.coturn.version }}"
        network_mode = "host"
        volumes      = [
          "local/turnserver.conf:/etc/coturn/turnserver.conf:ro"
        ]
      }

      template {
        change_mode = "restart"
        destination = "local/turnserver.conf"
        data        = <<EOH
{{ lookup('ansible.builtin.template', 'templates/turnserver.conf.j2') }}
  EOH
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory | int }}
      }
    }
  }
}
