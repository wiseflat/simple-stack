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
    count = 1

    network {
      port "grafana" {
        to = 3000
      }
    }

    // service name
    service {
      name = "{{ service_name }}"
      port = "grafana"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    task "{{ domain }}-grafana" {

      driver = "docker"

      env {
        GF_LOG_MODE = "console"
        GF_SERVER_HTTP_PORT = "3000"
        GF_INSTALL_PLUGINS = "grafana-piechart-panel"
        GF_SECURITY_ADMIN_USER = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='user', missing='create', nosymbols=true, length=8) }}"
        GF_SECURITY_ADMIN_PASSWORD = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='passwd', missing='create', length=12) }}"
        DS_PROMETHEUS = "prometheus"
      }

      config {
        image = "grafana/grafana:{{ softwares.grafana.version }}"
        volumes = [
          "{{ software_path }}/provisioning:/etc/grafana/provisioning:ro",
          "{{ software_path }}/dashboards:/local/dashboards:ro"
        ]
        ports = ["grafana"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
        memory_max = {{ size[software.size].memory * 2 }}
      }
    }
  }
}
