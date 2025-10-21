job "{{ domain }}" {
  region = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type = "service"

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

  group "{{ domain }}" {
    count = 1

    network {
      port "vector" {
        to = 8686
{% if software.static_port is defined %}
        static = {{ software.static_port }}
{% endif %}
      }
      port "vector_http" {
        to = 8687
        static = 8687
      }
    }

    // service name
    service {
      name = "{{ service_name }}"
      port = "vector"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    task "{{ domain }}-vector" {
      driver = "docker"

      template {
        change_mode = "restart"
        destination = "local/vector.yaml"
        perms = "644"
        data = <<EOH
{{ lookup('ansible.builtin.template', 'templates/vector.yaml.j2') }}
  EOH
      }

      config {
        image = "timberio/vector:{{ softwares.vector.version }}-alpine"
        volumes = [
          "{{ software_path }}/var/lib/vector:/var/lib/vector:rw"
        ]
        ports = ["vector", "vector_http"]
        args  = [
          "--config",
          "/local/vector.yaml"
        ]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
        memory_max = {{ size[software.size].memory * 2 }}
      }
    }
  }
}
