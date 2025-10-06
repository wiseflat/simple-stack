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
      port "minio" {
        to = 9000
      }
    }

    service {
      name = "minio"
      port = "minio"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}"
      ]
    }

    service {
      name = "{{ service_name }}"
      port = "minio"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    task "{{ domain }}-minio" {

      driver = "docker"

      env {
        MINIO_ROOT_USER = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='user', nosymbols=true, missing='create', length=8) }}"
        MINIO_ROOT_PASSWORD = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='passwd', missing='create', length=12) }}"
        MINIO_PROMETHEUS_AUTH_TYPE = "public"
      }

      config {
        image = "{{ docker_private_registry.url }}/minio:{{ softwares.minio.version }}"
        volumes = [
          "{{ software_path }}/data:/data:rw",
          "{{ software_path }}/var/backup:/var/backup:rw"
        ]
        ports = ["minio"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
