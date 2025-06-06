job "{{ domain }}" {
  region = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type = "service"

  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ fact_instance.location }}"
  }

  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ inventory_hostname }}"
  }

  group "{{ domain }}" {
    count = {{ software_vars.scale | default(1) }}

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
        image = "{{ software }}:{{ ansible_local.software_version[software] }}"
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
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
