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
        to = 5001
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
        SIMPLE_STACK_UI_USER = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='user', missing='error') }}"
        SIMPLE_STACK_UI_PASSWORD = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='password', missing='error') }}"
        SIMPLE_STACK_UI_URL = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='url', missing='error') }}"
        GITHUB_API_TOKEN = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='github_api_token', missing='error') }}"
        ANSIBLE_LOOKUP_PLUGINS = "/ansible/plugins/lookup"
        ANSIBLE_CALLBACK_PLUGINS = "/ansible/plugins/callback"
        ANSIBLE_CALLBACKS_ENABLED = "minimal,webhook_notifier"
      }

      config {
        image = "ghcr.io/wiseflat/simple-stack-ansible:v{{ softwares.simplestack_ui.version }}"
        ports = ["http"]
        volumes = [
          "/root/.ssh:/root/.ssh:ro"
        ]
        work_dir = "/ansible"
        command = "ansible-rulebook"
        args =  ["-r", "rulebook.yml", "-i", "inventory.py", "-vvv"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
