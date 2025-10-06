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
      port "apache" {
        to = 80
      }
    }

    service {
      name = "{{ service_name }}-nextcloud"
      port = "apache"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
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
        image = "nextcloud:{{ softwares.nextcloud.version }}"

        volumes = [
          "{{ software_path }}/var/www/html:/var/www/html:rw",
          "/data/{{ software.dbhost }}/run/mysqld:/var/run/mysqld:ro"
        ]

        ports = ["apache"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
