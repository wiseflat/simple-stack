job "{{ domain }}" {
  region      = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type        = "service"

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
        MINIO_ROOT_USER = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='access_key_id', missing='error') }}"
        MINIO_ROOT_PASSWORD = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='secret_access_key', missing='error') }}"
      }

      config {
        image = "minio/minio:{{ softwares.minio.version }}"
        volumes = [
          "{{ software_path }}/data/minio:/data:rw"
        ]
        ports = ["minio"]
        command      = "minio"
        args         = ["server", "/data"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
        memory_max = {{ size[software.size].memory * 2 }}
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
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    service {
      name = "mimir-exporter"
      port = "mimir_8080"
      provider = "nomad"
    }

    task "{{ domain }}-mimir" {

      driver = "docker"

      config {
        image = "grafana/mimir:{{ softwares.mimir.version }}"
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
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory | int }}
        memory_max = {{ size[software.size].memory * 2 }}
      }
    }
  }
}
