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
      port "arangodb" {
        to = 8529
      }
    }

    service {
      name = "{{ service_name }}"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}"{% if not loop.last %},{% endif %}{% endfor %}]
      port = "arangodb"
      provider = "nomad"
      check {
        name     = "test port alive"
        type     = "http"
        path     = "/"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit = 3
          grace = "90s"
          ignore_warnings = false
        }
      }
    }

    task "{{ domain }}-arangodb" {
      driver = "docker"

      env {
        ARANGO_ROOT_PASSWORD = "{{ lookup('community.general.passwordstore', 'arangodb/' + domain, missing='create', length=12) }}"
      }

      config {
        image = "{{ software }}:{{ ansible_local.software_version[software] }}"

        volumes = [
            "{{ software_path }}/var/lib/arangodb3:/var/lib/arangodb3:rw",
            "{{ software_path }}/var/lib/arangodb3-apps:/var/lib/arangodb3-apps:rw",
            "{{ software_path }}/var/backup:/var/backup:rw",
            "{{ software_path }}/etc:/etc:rw",
            "{{ software_path }}/run:/run:rw",
        ]

        ports = ["arangodb"]

        command = "arangod"
        args    = [
          "--server.authentication=true",
          "--config",
          "/etc/arangodb3/arangod.conf",
          "--server.authentication-unix-sockets=true"
        ]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
