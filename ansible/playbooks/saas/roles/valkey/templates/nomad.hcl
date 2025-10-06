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
      port "valkey" {
        to = 6379
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
        image = "{{ software }}/{{ software }}:{{ softwares.valkey.version }}"
        volumes = [
          "{{ software_path }}/data:/data:rw",
          "{{ software_path }}/etc/valkey:/etc/valkey:ro",
          "{{ software_path }}/run/valkey:/run/valkey:rw"
        ]
        ports = ["valkey"]
        command = "/usr/local/bin/valkey-server"
        args = [
          "/etc/valkey/valkey.conf",
]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
