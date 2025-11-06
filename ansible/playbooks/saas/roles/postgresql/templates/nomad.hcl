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
{% if software.static_port is defined %}
        static = {{ software.static_port }}
{% endif %}
      }
    }

    service {
      name = "{{ service_name }}"
      port = "postgresql"
      provider = "nomad"
      tags = []
    }

    task "{{ domain }}-postgresql" {

      driver = "docker"

      env {
        POSTGRES_PASSWORD = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='passwd', missing='create', length=12) }}"
        POSTGRES_HOST_AUTH_METHOD = "trust"
      }

      config {
        image = "postgres:{{ softwares.postgresql.version }}"
        ports = ["postgresql"]
        volumes = [
          "{{ software_path }}/var/lib/postgresql:/var/lib/postgresql:rw",
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
