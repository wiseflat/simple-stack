# htpasswd -Bbn test secret > htpasswd
# curl -iv -H "Authorization: Basic $(echo -n "test:secret" | base64)" https://registry.domain.com/v2/
# curl -X DELETE -H "Authorization: Basic $(echo -n "test:secret" | base64)" https://registry.domain.com/v1/repositories/common-focal/

job "{{ domain }}" {
  region      = "{{ fact_instance.region }}"
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

  group "registry" {
    count = 1

    network {
      port "registry" {
        to = 5000
        static = 5000
      }
    }

    service {
      name = "{{ service_name }}"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
      port = "registry"
      check {
        name     = "registry"
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

    task "{{ domain }}-registry_docker" {

      driver = "docker"

      env {
        USER_UID = "1000"
        USER_GID = "1000"
        REGISTRY_AUTH = "htpasswd"
        REGISTRY_AUTH_HTPASSWD_REALM = "Registry Realm"
        REGISTRY_AUTH_HTPASSWD_PATH = "/data/htpasswd"
        #There is a warning about the *HTTP secret*. It's only important if you have multiples registries behind a load balancer.
        REGISTRY_HTTP_SECRET = "Aumuu5ie-ieX7uwee-Aixah4ee"
      }

      config {
        image = "registry:{{ softwares.registry.version }}"
        volumes = [
          "{{ software_path }}/data:/data",
          "{{ software_path }}/var/lib/registry:/var/lib/registry"
        ]
        ports = ["registry"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
