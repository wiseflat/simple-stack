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

{% if software.constraints is defined and software.constraints.instance is defined %}
  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ software.constraints.instance }}"
  }
{% endif %}

  group "{{ domain }}" {
    count = {{ software.scale | default(1) }}

    network {
      port "http" {
        to = 8000
      }
    }

    service {
      name = "{{ service_name }}"
      port = "http"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    task "{{ domain }}-http" {
      driver = "docker"

      env {
        AUTH_SECRET = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='auth_secret', missing='error') }}"
        AUTH_COOKIE = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='auth_cookie', missing='error') }}"
      }

      user = "nodejs"

      config {
        image = "ghcr.io/wiseflat/simple-stack-ui:v{{ softwares.simplestack_ui.version }}"
        ports = ["http"]
        volumes =  [
          "{{ software_path }}/databases:/www/databases:rw"
        ]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
