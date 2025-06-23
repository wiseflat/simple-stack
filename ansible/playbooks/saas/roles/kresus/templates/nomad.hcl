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
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
    }

    task "{{ service_name }}-kresus" {
      driver = "docker"

      env {
        LOCAL_USER_ID = "kresus"
        KRESUS_DB_TYPE = "postgres"
        KRESUS_DB_HOST = "/tmp"
        KRESUS_DB_USERNAME = "{{ service_name }}"
        KRESUS_DB_PASSWORD = "{{ lookup('community.general.passwordstore', 'postgresql/' + domain, subkey='passwd') }}"
        KRESUS_DB_NAME = "{{ service_name }}"
      }

      config {
        image = "kresus:{{ hostvars[inventory_hostname].softwares.kresus }}"

        volumes = [
          "{{ software_path }}/opt/kresus/data:/home/user/data:rw",
          "/data/{{ software_vars.dbhost }}/tmp:/tmp:rw",
          "/etc/localtime:/etc/localtime:ro"
        ]

        ports = ["kresus"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
