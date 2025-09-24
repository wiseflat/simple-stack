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

  group "kresus" {
    count = 1

    network {
      port "kresus" {
        to = 9876
      }
    }

    service {
      name = "{{ service_name }}"
      port = "kresus"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    task "{{ service_name }}-kresus" {
      driver = "docker"

      env {
        LOCAL_USER_ID = "kresus"
        KRESUS_DB_TYPE = "postgres"
        KRESUS_DB_HOST = "/tmp"
        KRESUS_DB_USERNAME = "{{ service_name }}"
        KRESUS_DB_PASSWORD = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='passwd', missing='error') }}"
        KRESUS_DB_NAME = "{{ service_name }}"
      }

      config {
        image = "{{ docker_private_registry.url }}/kresus:{{ softwares.kresus.version }}"

        volumes = [
          "{{ software_path }}/opt/kresus/data:/home/user/data:rw",
          "/data/{{ software.dbhost }}/tmp:/tmp:rw",
          "/etc/localtime:/etc/localtime:ro"
        ]

        ports = ["kresus"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
