job "{{ domain }}" {
  region = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type = "service"

  node_pool = "default"
  priority = 50
  all_at_once = false
  namespace = "default"

  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ fact_instance.location }}"
  }

  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ inventory_hostname }}"
  }

  group "dolibarr" {

    count = {{ software_vars.scale }}

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
      mode = "bridge"

      port "dolibarr" {
      	to = 80
      	host_network = "public"
      }
    }

    service {
      name = "{{ service_name }}"

      port = "dolibarr"

      provider = "nomad"

      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}"{% if not loop.last %},{% endif %}{% endfor %}]

    }

    task "dolibarr" {
      driver = "docker"

      config {
        image = "dolibarr/dolibarr:{{ latest_version }}"

        mount {
          type = "bind"
          source = "{{ software_path }}/var/www/documents"
          target = "/var/www/documents"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "bind"
          source = "{{ software_path }}/var/www/html/custom"
          target = "/var/www/html/custom"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "bind"
          source = "local/servername.conf"
          target = "/etc/apache2/conf-enabled/servername.conf"
          readonly = true
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "bind"
          source = "local/remoteip.load"
          target = "/etc/apache2/mods-enabled/remoteip.load"
          readonly = true
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "bind"
          source = "local/remoteip.conf"
          target = "/etc/apache2/mods-enabled/remoteip.conf"
          readonly = true
          bind_options {
            propagation = "rshared"
          }
        }
      }

      template {
        data = <<EOH
ServerName {{ domain }}
EOH
        destination = "local/servername.conf"
      }

      template {
        data = <<EOH
LoadModule remoteip_module /usr/lib/apache2/modules/mod_remoteip.so
EOH
        destination = "local/remoteip.load"
      }

      template {
        data = <<EOH
RemoteIPHeader X-Forwarded-For
EOH
        destination = "local/remoteip.conf"
      }

      template {
        data = <<EOH
ANSIBLE_FORCE_COLOR=TRUE

PHP_INI_DATE_TIMEZONE="Europe/Paris"

PHP_INI_MEMORY_LIMIT="256M"

PHP_INI_UPLOAD_MAX_FILESIZE="20M"

PHP_INI_POST_MAX_SIZE="8M"

PHP_INI_ALLOW_URL_FOPEN=0

DOLI_INSTALL_AUTO=1

DOLI_INIT_DEMO=0

DOLI_PROD=1

DOLI_DB_TYPE=mysqli

{% raw %}{{ range nomadService "{% endraw %}{{ software_vars.dbhost | replace('-', '') | replace('.', '') }}{% raw %}" }}
DOLI_DB_HOST="{{ .Address }}"
        
DOLI_DB_HOST_PORT="{{ .Port }}"
{{ end }}
{% endraw %}

DOLI_DB_NAME="{{ service_name[:32] }}"

DOLI_DB_USER={{ lookup('community.general.passwordstore', 'mariadb/' + domain + '/user') }}

DOLI_DB_PASSWORD={{ lookup('community.general.passwordstore', 'mariadb/' + domain + '/passwd') }}

DOLI_URL_ROOT="https://{{ domain }}"

DOLI_ADMIN_LOGIN={{ doli_admin_login | default('admin' + domain | replace('.', '') | replace('-', '')) }}

DOLI_ADMIN_PASSWORD={{ lookup('community.general.passwordstore', 'dolibarr/' + domain + '/doli_admin_password', missing='create', length=20) }}

DOLI_ENABLE_MODULES="Societe,Facture,Propale,Fournisseur,Cron,Order,Bank,Margin,Product"

DOLI_COMPANY_NAME="{{ domain }}"

DOLI_COMPANY_COUNTRYCODE="FR"

DOLI_AUTH="dolibarr"

DOLI_LDAP_HOST="127.0.0.1"

DOLI_LDAP_PORT="389"

DOLI_LDAP_VERSION="3"

DOLI_LDAP_SERVER_TYPE="openldap"

DOLI_LDAP_LOGIN_ATTRIBUTE="uid"

DOLI_LDAP_DN=""

DOLI_LDAP_FILTER=""

DOLI_LDAP_BIND_DN=""

DOLI_LDAP_BIND_PASS=""

DOLI_LDAP_DEBUG="False"

DOLI_CRON=0

DOLI_CRON_KEY="{{ lookup('community.general.passwordstore', 'dolibarr/' + domain + '/doli_cron_key', missing='create', nosymbols=true, length=32) }}"

DOLI_CRON_USER="{{ doli_admin_login | default('admin' + domain | replace('.', '') | replace('-', '')) }}"

DOLI_INSTANCE_UNIQUE_ID={{ lookup('community.general.passwordstore', 'dolibarr/' + domain + '/doli_salt_key', missing='create', nosymbols=true, length=65) }}

EOH
        destination = "secrets/env"
        env         = true
      }

      resources {
        cpu    = 512
        memory = 512
      }
    }
  }

}
