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
      port "litellm" {
        to = 4000
{% if software.static_port is defined %}
        static = {{ software.static_port }}
{% endif %}
      }
    }

    service {
      name = "{{ service_name }}"
      port = "litellm"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
      check {
        type     = "http"
        path     = "/health/liveliness"
        interval = "30s"
        timeout  = "10s"
      }
    }

    task "{{ domain }}-milvus" {
      driver = "docker"

      template {
        change_mode = "restart"
        destination = "local/config.yaml"
        perms = "644"
        data = <<EOH
{{ (software.litellm_config | to_nice_yaml) | default(litellm_config) }}
  EOH
      }

      config {
        image = "ghcr.io/berriai/litellm:v{{ softwares.litellm.version }}"
        ports = ["litellm"]
        args = [
          "--config=/local/config.yaml"
        ]
      }

      env {
{% for env in (lookup('simple-stack-ui', type='secret', key=domain, subkey='litellm_env', missing='warn') | from_json) | default(litellm_env) %}
       {{ env.key }} = "{{ env.value }}"
{% endfor %}
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
        memory_max = {{ size[software.size].memory * 2 }}
      }
    }
  }
}
