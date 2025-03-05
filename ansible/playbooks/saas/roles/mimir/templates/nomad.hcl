job "{{ domain }}" {
  region      = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type        = "service"

  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ fact_instance.location }}"
  }

  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ inventory_hostname }}"
  }

  group "{{ domain }}-minio" {
    count = 1

    network {
      port "minio" {
        to = 9000
        static = 9000
      }
    }

    service {
      name = "minio-{{ service_name }}"
      port = "minio"
      provider = "nomad"
    }

    task "{{ domain }}-minio" {

      driver = "docker"

      env {
        MINIO_ROOT_USER = "{{ lookup('community.general.passwordstore', 'minio/' + domain, subkey='access_key_id') }}"
        MINIO_ROOT_PASSWORD = "{{ lookup('community.general.passwordstore', 'minio/' + domain, subkey='secret_access_key') }}"
      }

      config {
        image = "minio/minio:{{ ansible_local.software_version['minio'] }}"
        volumes = [
          "{{ software_path }}/data/minio:/data:rw"
        ]
        ports = ["minio"]
        command      = "minio"
        args         = ["server", "/data"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }

  group "{{ domain }}-mimir" {
    count = 3

    network {
      port "mimir_7946" {
        to = 7946
      }
      port "mimir_9095" {
        to = 9095
      }
      port "mimir_8080" {
        to = 8080
      }
    }

    service {
      name = "mimir"
      port = "mimir_7946"
      provider = "nomad"
    }

    service {
      name = "mimir-http"
      port = "mimir_8080"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}"{% if not loop.last %},{% endif %}{% endfor %}]
    }

    service {
      name = "mimir-exporter"
      port = "mimir_8080"
      provider = "nomad"
    }

    task "{{ domain }}-mimir" {

      driver = "docker"

      config {
        image = "grafana/mimir:{{ ansible_local.software_version['mimir'] }}"
        volumes = [
          "{{ software_path }}/config:/config",
          "{{ software_path }}/mimir-${NOMAD_ALLOC_INDEX}:/data",
        ]
        args = [
          "-config.file=/config/mimir.yaml",
          "-memberlist.join=dnssrv+mimir.default.service.nomad"
        ]
        ports = ["mimir_7946", "mimir_9095", "mimir_8080"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory | int }}
        # memory_max = {{ size[software_vars.size].memory * 2 }}
      }
    }
  }
}
