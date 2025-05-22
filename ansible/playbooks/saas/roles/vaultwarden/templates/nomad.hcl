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

    update {
      max_parallel      = 1
      canary            = 1
      min_healthy_time  = "10s"
      healthy_deadline  = "5m"
      progress_deadline = "10m"
      auto_revert       = true
      auto_promote      = true
      health_check      = "checks"
      stagger           = "30s"
    }

    restart {
      attempts = 10
      interval = "5m"
      delay = "10s"
      mode = "delay"
    }
    
    network {
      port "vaultwarden" {
        to = 80
      }
    }

    service {
      name = "{{ service_name }}"
      port = "vaultwarden"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
    }

    task "vaultwarden" {
      driver = "docker"

      template {
        data = <<EOH
ANSIBLE_FORCE_COLOR=TRUE

DOMAIN="https://{{ domain }}"

DATABASE_URL=mysql://{{ lookup('community.general.passwordstore', 'mariadb/' + domain, subkey='user') }}:{{ lookup('community.general.passwordstore', 'mariadb/' + domain, subkey='passwd') }}@localhost/{{ software_vars.dbname | default(service_name[:32]) }}

DB_CONNECTION_RETRIES=15

DATABASE_TIMEOUT=30

DATABASE_MAX_CONNS=20

ADMIN_TOKEN="${{ lookup('community.general.passwordstore', software + '/' + domain, subkey='token_argon2') }}"

ENABLE_WEBSOCKET=true

SENDS_ALLOWED=true

SIGNUPS_ALLOWED=false

SIGNUPS_VERIFY=false

SIGNUPS_DOMAINS_WHITELIST={{ software_vars.signups_domains_whitelist }}

ORG_CREATION_USERS=

EMAIL_CHANGE_ALLOWED=false

IP_HEADER=X-Real-IP

LOG_LEVEL=error

SMTP_HOST={{ software_vars.smtp_host }}

SMTP_FROM={{ software_vars.smtp_from }}

SMTP_FROM_NAME={{ software_vars.smtp_from_name }}

SMTP_USERNAME={{ software_vars.smtp_username }}

SMTP_PASSWORD={{ software_vars.smtp_password }}

SMTP_TIMEOUT=15

EOH
        destination = "secrets/env"
        env         = true
      }

      config {
        image = "docker.io/vaultwarden/server:{{ ansible_local.software_version[software] }}"

        mount {
          type = "bind"
          target = "/data"
          source = "{{ software_path }}/data"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }

        mount {
          type = "bind"
          target = "/run/mysqld/mysqld.sock"
          source = "/data/{{ software_vars.dbhost }}/run/mysqld/mysqld.sock"
          readonly = true
          bind_options {
            propagation = "rshared"
          }
        }

        ports = ["vaultwarden"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
