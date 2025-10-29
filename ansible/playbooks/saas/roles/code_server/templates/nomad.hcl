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
      port "code_server" {
        to = "8080"
      }
      port "http_dev" {
        to = 8000
      }
    }

    service {
      name = "{{ service_name }}"
      port = "code_server"
      provider = "nomad"
      tags = [
        {{ lookup('ansible.builtin.template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
      check {
        type     = "http"
        path     = "/"
        interval = "10s"
        timeout  = "2s"
      }
    }

    service {
      name = "{{ service_name }}-dev"
      port = "http_dev"
      provider = "nomad"
      tags = [
        {{ lookup('ansible.builtin.template', 'templates/traefik_tag.j2', template_vars={'prefix': 'dev'}) | indent(8) }}
      ]
    }

    task "{{ software.domain }}-codeserver" {

      driver = "docker"

      env {
        PUID = "1000"
        PGID = "1000"
        TZ = "{{ software.timezone | default(timezone) }}"
        DOCKER_USER = "ubuntu"
        PASSWORD= "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='password', missing='error') }}"
        SUDO_PASSWORD = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='password', missing='error') }}"
      }

      config {
        image = "codercom/code-server:{{ softwares.code_server.version }}-ubuntu"

        volumes = [
          "/usr/bin/docker:/usr/bin/docker",
          "/var/run/docker.sock:/var/run/docker.sock",
          "/usr/local/bin/terraform:/usr/local/bin/terraform",
          "{{ software_path }}/config/workspace:/config/workspace",
          "{{ software_path }}/home/coder/.cache:/home/coder/.cache",
          "{{ software_path }}/home/coder/.config:/home/coder/.config",
          "{{ software_path }}/home/coder/.cache:/home/coder/.local",
          "{{ software_path }}/home/coder/.ssh:/home/coder/.ssh",
          "{{ software_path }}/projects:/home/coder/projects",
        ]
        ports = ["code_server", "http_dev"]
      }

      resources {
        cpu    = {{ size[software.size2 | default(software.size)].cpu }}
        memory = {{ size[software.size2 | default(software.size)].memory }}
      }
    }
  }
}
