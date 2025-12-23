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

  group "freqtrade" {

    count = 1

    restart {
      attempts = 2
      interval = "10m"
      delay = "15s"
      mode = "fail"
    }

    network {
      port "http" {
        to = 8080
      }
    }

    service {
      name = "http"
      port = "http"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
      check {
        name     = "traefik"
        type     = "tcp"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit = 3
          grace = "90s"
          ignore_warnings = false
        }
      }
    }

    task "freqtrade" {

      driver = "docker"

      kill_signal = "SIGTERM"

      env {
{% for env in (lookup('simple-stack-ui', type='secret', key=domain, subkey='additional_env', missing='warn') | from_json) | default(litellm_env) %}
       {{ env.key }} = "{{ env.value }}"
{% endfor %}
      }
      config {
        image = "freqtradeorg/freqtrade:{{ softwares.freqtrade.version }}"
        volumes = [
          "{{ software_path }}/freqtrade/user_data:/freqtrade/user_data:rw",
          "{{ software_path }}/db:/db:rw"
        ]
        ports = ["http"]

        command = "trade"
        args = [
          "--config",
          "/freqtrade/user_data/{{ software.config }}.json",
          "--db-url",
          "sqlite:////db/tradesv3{{ software.strategy }}.sqlite",
          "--strategy",
          "{{ software.strategy }}"
        ]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
