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
      port "valkey" {
        to = 6379
{% if software.static_port is defined %}
        static = {{ software.static_port }}
{% endif %}
      }
    }

    service {
      name = "{{ service_name }}"
      port = "valkey"
      provider = "nomad"
      tags = []
    }

    task "{{ domain }}-valkey" {
      driver = "docker"

      config {
        image = "valkey/valkey:{{ softwares.valkey.version }}"
        volumes = [
          "{{ software_path }}/data:/data:rw",
          "{{ software_path }}/etc/valkey:/etc/valkey:ro",
          "{{ software_path }}/run/valkey:/run/valkey:rw"
        ]
        ports = ["valkey"]
        command = "/usr/local/bin/valkey-server"
        args = [
          "/local/valkey.conf",
        ]
      }

      template {
        change_mode = "restart"
        destination = "local/valkey.conf"
        data = <<EOH
{{ lookup('ansible.builtin.template', 'templates/valkey.conf') }}
  EOH
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
