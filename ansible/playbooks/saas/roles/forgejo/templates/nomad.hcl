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
    count = {{ software_vars.scale | default(1) }}

    network {
      port "forgejo" {
        to = 3000
      }
    }

    service {
      name = "{{ service_name }}"
      port = "forgejo"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
    }

    task "{{ domain }}-forgejo" {
      driver = "docker"

      env {
        USER_UID = "1000"
        USER_GID = "1000"
        APP_DATA_PATH = "/"
      }

      config {
        image = "{{ software }}:{{ ansible_local.software_version[software] }}"
        volumes = [
          "{{ software_path }}/data:/data:rw",
          "{{ software_path }}/var/backup:/var/backup:rw",
          "{{ software_path }}/var/log:/var/log:rw",
          "/etc/timezone:/etc/timezone:ro",
          "/etc/localtime:/etc/localtime:ro",
          "/data/{{ software_vars.dbhost }}/run/mysqld:/run/mysqld:ro"
        ]
        ports = ["forgejo"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
