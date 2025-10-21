job "{{ domain }}" {
  region      = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type        = "service"

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

  group "{{ domain }}-minio" {
    count = 1

{% if software.constraints is defined and software.constraints.minio_instance is defined %}
    constraint {
      attribute    = "${meta.instance}"
      set_contains = "{{ software.constraints.minio_instance }}"
    }
{% endif %}

    network {
      port "minio" {
        to = 9000
        static = 9000
      }
    }

    service {
      name = "minio-{{ service_name }}"
      port = "minio"
      provider = "nomad"
    }

    task "{{ domain }}-minio" {

      driver = "docker"

      env {
        MINIO_ROOT_USER = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='access_key_id', missing='create', length=12) }}"
        MINIO_ROOT_PASSWORD = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='secret_access_key', missing='create', length=12) }}"
      }

      config {
        image = "minio/minio:{{ softwares.minio.version }}"
        volumes = [
          "{{ software_path }}/data/minio:/data:rw"
        ]
        ports = ["minio"]
        command      = "minio"
        args         = ["server", "/data"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
        memory_max = {{ size[software.size].memory * 2 }}
      }
    }
  }

  group "{{ domain }}-mimir" {
    count = 3

{% if software.constraints is defined and software.constraints.distinct_hosts is defined %}
    constraint {
      operator  = "distinct_hosts"
      value     = "{{ software.constraints.distinct_hosts | lower }}"
    }
{% endif %}

    network {
      port "mimir_7946" {
        to = 7946
        static = 7946
      }
      port "mimir_9095" {
        to = 9095
        static = 9095
      }
      port "mimir_8080" {
        to = 8080
        static = 8080
      }
    }

    service {
      name = "mimir"
      port = "mimir_7946"
      provider = "nomad"
    }

    service {
      name = "mimir-http"
      port = "mimir_8080"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
    }

    service {
      name = "mimir-exporter"
      port = "mimir_8080"
      provider = "nomad"
    }

    task "{{ domain }}-mimir" {

      driver = "docker"

      env {
        IP = "${attr.unique.network.ip-address}"
      }

      config {
        image = "grafana/mimir:{{ softwares.mimir.version }}"
        network_mode = "host"
        volumes = [
          "{{ software_path }}/mimir-${NOMAD_ALLOC_INDEX}:/data",
        ]
        args = [
          "-config.file=/local/mimir.yaml",
          "-memberlist.join=dnssrv+mimir.default.service.nomad"
        ]
        ports = ["mimir_7946", "mimir_9095", "mimir_8080"]
      }

      template {
        change_mode = "restart"
        destination = "local/mimir.yaml"
        data = <<EOH
{{ lookup('ansible.builtin.template', 'templates/mimir.yaml.j2') }}
  EOH
      }

      template {
        change_mode = "restart"
        destination = "local/rules.yaml"
        data = <<EOH
{{ lookup('ansible.builtin.template', 'files/rules.yaml') }}
  EOH
      }

      template {
        change_mode = "restart"
        destination = "local/alertmanager-fallback-config.yaml"
        data = <<EOH
{{ lookup('ansible.builtin.template', 'templates/alertmanager-fallback-config.yaml.j2') }}
  EOH
      }

      template {
        change_mode = "restart"
        destination = "local/prometheus.yaml"
        data = <<EOH
{{ lookup('ansible.builtin.template', 'templates/prometheus.yaml') }}
  EOH
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory | int }}
        memory_max = {{ size[software.size].memory * 2 }}
      }
    }
  }
}
