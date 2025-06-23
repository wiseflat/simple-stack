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
        POSTGRESQL_PASSWORD = "{{ lookup('community.general.passwordstore', 'postgresql/' + domain, missing='create', subkey='passwd', length=12) }}"
      }

      config {
        image = "bitnami/postgresql:{{ hostvars[inventory_hostname].softwares.postgresql }}"
        volumes = [
          "{{ software_path }}/bitnami/postgresql:/bitnami/postgresql:rw",
          "{{ software_path }}/tmp:/tmp:rw"
        ]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory | int }}
        memory_max = {{ size[software_vars.size].memory * 2 }}
      }
    }
  }
}
