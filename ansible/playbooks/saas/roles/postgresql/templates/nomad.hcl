job "{{ domain }}" {
  region      = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type        = "service"

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

  group "postgresql" {
    count = 1

    network {
      port "postgresql" {
        to = 5432
      }
    }

    service {
      name = "{{ service_name }}-postgresql"
      port = "postgresql"
      provider = "nomad"
      tags = []
    }

    task "{{ domain }}-postgresql" {

      driver = "docker"

      env {
        POSTGRESQL_PASSWORD = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='passwd', missing='create', length=12) }}"
      }

      config {
        image = "bitnami/postgresql:{{ softwares.postgresql.version }}"
        volumes = [
          "{{ software_path }}/bitnami/postgresql:/bitnami/postgresql:rw",
          "{{ software_path }}/tmp:/tmp:rw"
        ]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory | int }}
        memory_max = {{ size[software.size].memory * 2 }}
      }
    }
  }
}
