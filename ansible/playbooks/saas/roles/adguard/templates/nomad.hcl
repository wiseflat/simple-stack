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
      port "dns" {
        static       = 53
      }
      port "dhcp" {
        static       = 67
      }
    }

    service {
      name = "dns"
      port = "dns"
      provider = "nomad"
      tags = []
    }

    service {
      name = "dhcp"
      port = "dhcp"
      provider = "nomad"
      tags = []
    }

    task "{{ domain }}-adguard" {
      driver = "docker"

      config {
        image = "{{ software }}:{{ softwares.adguard.version }}"
        network_mode = "host"
        privileged = "true"
        volumes = [
          "{{ software_path }}/etc/adguard:/etc/adguard:rw",
          "{{ software_path }}/usr/local/bin/data/filters:/usr/local/bin/data/filters:rw",
          "{{ software_path }}/usr/local/bin/data:/usr/local/bin/data:rw"
        ]
        ports = ["dhcp", "dns"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
