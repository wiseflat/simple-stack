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
    count = 1

    restart {
      attempts = 2
      interval = "10m"
      delay = "15s"
      mode = "fail"
    }

    network {
      port "caddy" {
        to = 8080
      }
      port "metrics" {
        to = 2019
      }
    }

    service {
      name = "{{ service_name }}"
      port = "caddy"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
      check {
        name     = "{{ service_name }}"
        type     = "http"
        path     = "/"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit = 3
          grace = "90s"
          ignore_warnings = false
        }
      }
    }

    service {
      name = "caddy"
      port = "metrics"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}",
      ]
    }

{% if software_vars.domain_type == "public" %}
    service {
      name = "external-check"
      provider = "nomad"
      tags = [
        "fqdn:https://{{ domain }}",
      ]
    }
{% endif %}

    task "{{ domain }}-caddy" {
      driver = "docker"

      config {
        image = "{{ software }}:{{ ansible_local.software_version[software] }}"
        volumes = [
          "{{ software_path }}/etc/caddy:/etc/caddy:ro"
        ]
        ports = ["caddy", "metrics"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
