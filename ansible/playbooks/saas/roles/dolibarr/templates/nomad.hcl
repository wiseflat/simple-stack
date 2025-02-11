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

    count = {{ software_vars.scale.dolibarr }}

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

      port "nextcloud" {
      	to = 80
      	host_network = "public"
      }
    }

    service {
      name = "{{ domain | replace('.', '-') }}"

      port = "nextcloud"

      provider = "nomad"

      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}"{% if not loop.last %},{% endif %}{% endfor %}]

    }

    task "dolibarr" {
      driver = "docker"

      config {
        image = "upshift/dolibarr:20.0.3"


        mount {
          type = "bind"
          target = "/var/www/html"
          source = "{{ software_path }}/var/www/html"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "bind"
          target = "/var/www/documents"
          source = "{{ software_path }}/var/www/documents"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "bind"
          target = "/var/www/html/custom"
          source = "{{ software_path }}/var/www/custom"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "bind"
          target = "/var/www/html/conf"
          source = "{{ software_path }}/var/www/conf"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }

      }


      template {
        data = <<EOH
ANSIBLE_FORCE_COLOR=TRUE

DOLI_DB_TYPE="mysqli"

DOLI_DB_HOST="172.17.0.1"

DOLI_DB_NAME="{{ service_name[:32] }}"

DOLI_DB_USER={{ lookup('community.general.passwordstore', 'mariadb/' + domain, missing='create', subkey='user', nosymbols=true, length=8) }}

DOLI_DB_PASSWORD={{ lookup('community.general.passwordstore', 'mariadb/' + domain, subkey='passwd', missing='create', length=12) }}

DOLI_ADMIN_LOGIN={{ doli_admin_login}}

DOLI_ADMIN_PASSWORD={{ doli_admin_password }}

DOLI_URL_ROOT= "{{ domain }}"

DOLI_DB_PORT="3306"

DOLI_DB_PREFIX="llx_"

DOLI_DB_CHARACTER_SET="utf8"

DOLI_DB_COLLATION="utf8_unicode_ci"

DOLI_MODULES="modSociete,modPropale,modFournisseur"

DOLI_LDAP_HOST="127.0.2.1"

DOLI_LDAP_PORT="3389"

DOLI_LDAP_VERSION="3"

DOLI_LDAP_SERVERTYPE="openldap"

DOLI_LDAP_DN=""

DOLI_LDAP_LOGIN_ATTRIBUTE="uid"

DOLI_LDAP_FILTER=""

DOLI_LDAP_ADMIN_LOGIN=""

DOLI_LDAP_ADMIN_PASS=""

DOLI_LDAP_DEBUG="False"

DOLI_PROD=1

DOLI_HTTPS=0

DOLI_NO_CSRF_CHECK=1

PHP_INI_upload_max_filesize="50M"

PHP_INI_memory_limit="256M"

PHP_INI_max_execution_time="60"

EOH
        destination = "secrets/file_group_01.env"
        env         = true
      }

      resources {
        cpu    = 512
        memory = 512
      }
    }
  }

}
