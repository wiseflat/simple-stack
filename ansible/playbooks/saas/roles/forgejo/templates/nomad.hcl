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
    count = {{ software.scale | default(1) }}

    network {
      port "forgejo" {
        to = 3000
      }
    }

    service {
      name = "{{ service_name }}"
      port = "forgejo"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    task "{{ domain }}-forgejo" {
      driver = "docker"

      env {
        {{ forgejo_actions.environment }}
      }

      config {
        image = "{{ docker_private_registry.url }}/forgejo:{{ softwares.forgejo.version }}"
        volumes =  [
          "/etc/timezone:/etc/timezone:ro",
          "/etc/localtime:/etc/localtime:ro",
          "{{ software_path }}/data:/data:rw",
          "{{ software_path }}/var/backup:/var/backup:rw",
          "{{ software_path }}/var/log:/var/log:rw",
          "/data/{{ software.dbhost }}/run/mysqld:/run/mysqld:ro"
        ]
        ports = ["forgejo"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
