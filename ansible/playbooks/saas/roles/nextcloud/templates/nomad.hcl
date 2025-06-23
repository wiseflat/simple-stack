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
    count = 1

    network {
      port "apache" {
        to = 80
      }
    }

    service {
      name = "{{ service_name }}-nextcloud"
      port = "apache"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
      check {
        type     = "tcp"
        port     = "apache"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit = 3
          grace = "90s"
          ignore_warnings = false
        }
      }
    }

    task "{{ domain }}-apache" {

      driver = "docker"

      config {
        image = "{{ software }}:{{ hostvars[inventory_hostname].softwares.nextcloud }}"

        volumes = [
          "{{ software_path }}/var/www/html:/var/www/html:rw",
          "/data/{{ software_vars.dbhost }}/run/mysqld:/var/run/mysqld:ro"
        ]

        ports = ["apache"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
