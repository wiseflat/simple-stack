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
        GF_SECURITY_ADMIN_USER = "{{ lookup('community.general.passwordstore', 'grafana/' + domain, create=true, subkey='user', nosymbols=true, length=8) }}"
        GF_SECURITY_ADMIN_PASSWORD = "{{ lookup('community.general.passwordstore', 'grafana/' + domain, create=true, subkey='passwd', length=12) }}"
        DS_PROMETHEUS = "prometheus"
      }

      config {
        image = "grafana/grafana:{{ hostvars[inventory_hostname].softwares.grafana }}"
        volumes = [
          "{{ software_path }}/provisioning:/etc/grafana/provisioning:ro",
          "{{ software_path }}/dashboards:/local/dashboards:ro"
        ]
        ports = ["grafana"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
