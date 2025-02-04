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
      port "minio" {
        to = 9000
      }
    }

    service {
      name = "{{ service_name }}"
      port = "minio"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
      check {
        name     = "{{ service_name }}"
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

    task "{{ domain }}-minio" {

      driver = "docker"

      env {
        MINIO_ROOT_USER = "{{ lookup('community.general.passwordstore', 'minio/' + domain, create=true, subkey='user', nosymbols=true, length=8) }}"
        MINIO_ROOT_PASSWORD = "{{ lookup('community.general.passwordstore', 'minio/' + domain, create=true, subkey='passwd', length=12) }}"
      }

      config {
        image = "{{ software }}:{{ ansible_local.software_version[software] }}"
        volumes = [
          "{{ software_path }}/data:/data:rw"
          "{{ software_path }}/var/backup:/var/backup:rw"
        ]
        ports = ["minio"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
