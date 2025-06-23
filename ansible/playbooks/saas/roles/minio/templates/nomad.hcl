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
      port "minio" {
        to = 9000
      }
    }

    service {
      name = "minio"
      port = "minio"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}"
      ]
    }

    service {
      name = "{{ service_name }}"
      port = "minio"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
    }

    task "{{ domain }}-minio" {

      driver = "docker"

      env {
        MINIO_ROOT_USER = "{{ lookup('community.general.passwordstore', 'minio/' + domain, create=true, subkey='user', nosymbols=true, userpass=software_vars.username | default(none), length=8) }}"
        MINIO_ROOT_PASSWORD = "{{ lookup('community.general.passwordstore', 'minio/' + domain, create=true, subkey='passwd', userpass=software_vars.userpass | default(none), length=12) }}"
        MINIO_PROMETHEUS_AUTH_TYPE = "public"
      }

      config {
        image = "{{ software }}:{{ hostvars[inventory_hostname].softwares.minio }}"
        volumes = [
          "{{ software_path }}/data:/data:rw",
          "{{ software_path }}/var/backup:/var/backup:rw"
        ]
        ports = ["minio"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
