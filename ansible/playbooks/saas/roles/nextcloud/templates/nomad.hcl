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

  group "nextcloud" {

    count = {{ software_vars.scale.nextcloud }}

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

    task "wait-for-db" {

      driver = "docker"

      lifecycle {
        hook = "prestart"
        sidecar = false
      }

      config {
        image = "busybox"

        command = "sh"
        args = ["-c","until nc -z {{ software_vars.dbhost | replace('-', '') | replace('.', '') }}.default.service.nomad 3306; do sleep 1; echo 'Waiting for DB to come up...'; done"]
      }
    }

    task "nextcloud" {
      driver = "docker"

      config {
        image = "nextcloud:{{ ansible_local.software_version['nextcloud'] }}"


        mount {
          type = "bind"
          target = "/var/www/html"
          source = "{{ software_path }}/data/var/www/html"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "bind"
          target = "/usr/share/tesseract-ocr/4.00/tessdata/fra.traineddata"
          source = "{{ software_path }}/data/usr/share/tesseract-ocr/4.00/tessdata/fra.traineddata"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "bind"
          target = "/etc/supervisor/conf.d/supervisord.conf"
          source = "local/supervisord.conf"
          readonly = true
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "bind"
          target = "/fulltextsearch.sh"
          source = "local/fulltextsearch.sh"
          readonly = true
          bind_options {
            propagation = "rshared"
          }
        }

      }

      template {
        change_mode = "noop"
        destination = "local/fulltextsearch.sh"
        data = <<EOH
#!/bin/bash

TMUX_CMD_LIVE="su -s /bin/bash www-data -c '/usr/local/bin/php /var/www/html/occ fulltextsearch:live'"
TMUX_CMD_STOP="su -s /bin/bash www-data -c '/usr/local/bin/php /var/www/html/occ fulltextsearch:stop'"

# Set the TMUX session name
SESSION_NAME="fulltextsearch"

# Start a new TMUX session if one doesn't exist and attach to it
tmux ls | grep -q "$SESSION_NAME" || tmux new-session -d -s "$SESSION_NAME" "bash -l" &

# Attach to the existing TMUX session, or start a new one if it doesn't exist
tmux attach-session -t "$SESSION_NAME"

# Run the command in the TMUX session
tmux send-keys "$TMUX_CMD_STOP" C-m

tmux send-keys "$TMUX_CMD_LIVE" C-m

# Detach from the TMUX session after executing the command
tmux detach -s "$SESSION_NAME"

EOH
      }

      template {
        change_mode = "noop"
        destination = "local/supervisord.conf"
        data = <<EOH

[supervisord]
nodaemon=true
logfile=/var/log/supervisord/supervisord.log
pidfile=/var/run/supervisord/supervisord.pid
childlogdir=/var/log/supervisord/
logfile_maxbytes=50MB                           ; maximum size of logfile before rotation
logfile_backups=10                              ; number of backed up logfiles
loglevel=error

[program:apache2]
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
command=apache2-foreground

[program:cron]
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
command=/cron.sh

[program:fulltextsearch_index_live]
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
command=/bin/bash /fulltextsearch.sh

EOH
      }


      template {
        data = <<EOH
ANSIBLE_FORCE_COLOR=TRUE

NEXTCLOUD_URL={{ domain }}

FQDN={{ domain }}

NEXTCLOUD_ADMIN_USER={{ nextcloud_admin_user }}

NEXTCLOUD_ADMIN_PASSWORD={{ nextcloud_admin_password }}

OVERWRITEPROTOCOL=https

NEXTCLOUD_TRUSTED_DOMAINS={{ domain }} 127.0.0.1

TRUSTED_PROXIES=127.0.0.1

APACHE_DISABLE_REWRITE_IP=1

MYSQL_HOST=172.17.0.1

MYSQL_USER={{ lookup('community.general.passwordstore', 'mariadb/' + domain, subkey='user') }}

MYSQL_PASSWORD={{ lookup('community.general.passwordstore', 'mariadb/' + domain, subkey='passwd') }}

MYSQL_DATABASE={{ service_name[:32] }}

REDIS_HOST={% raw %}{{ env NOMAD_ADDR_redis }}{% endraw %}

REDIS_HOST_PORT=6379

REDIS_HOST_PASSWORD={{ redis_password }}

SMTP_HOST={{ nextcloud_smtp_host }}

SMTP_SECURE={{ nextcloud_smtp_secure }}

SMTP_PORT={{ nextcloud_smtp_port }}

SMTP_AUTHTYPE={{ nextcloud_smtp_authtype }}

SMTP_NAME={{ nextcloud_smtp_name }}

SMTP_PASSWORD={{ nextcloud_smtp_password }}

MAIL_FROM_ADDRESS={{ nextcloud_smtp_from_address }}

MAIL_DOMAIN={{ nextcloud_smtp_mail_domain }}

EOH
        destination = "secrets/file_group_01.env"
        env         = true
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory | int }}
        # memory_max = {{ size[software_vars.size].memory * 2 }}
      }
    }
  }

  group "redis" {

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
      mode = "bridge"

      port "redis" {
        to = 6379
        static = 6379
        host_network = "internal"
      }
    }

    service {
      name = "redis"

      port = "redis"

			provider = "nomad"

    }

    task "redis" {
      driver = "docker"

      config {
        image = "redis:7.4.0-alpine3.20"

        args = ["/etc/redis.conf"]


        mount {
          type = "bind"
          target = "/etc/redis.conf"
          source = "local/redis.conf"
          readonly = true
          bind_options {
            propagation = "rshared"
          }
        }

        ports = ["redis"]
      }

      template {
        change_mode = "noop"
        destination = "local/redis.conf"
        data = <<EOH

requirepass {{ redis_password }}

EOH
      }

      resources {
        cpu    = 512
        memory = 512
      }
    }
  }

  group "clamav" {

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
      mode = "bridge"

      port "clamav" {
        to = 3310
        static = 3310
        host_network = "internal"
      }
    }

    service {
      name = "clamav"

      port = "clamav"

      provider = "nomad"
    }

    task "clamav" {
      driver = "docker"

      config {
        image = "clamav/clamav:1.4.2_base"


        mount {
          type = "bind"
          target = "/var/lib/clamav"
          source = "{{ software_path }}/data/var/lib/clamav"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }

        ports = ["clamav"]
      }

      resources {
        cpu    = 2048
        memory = 2048
      }
    }
  }

  group "collabora" {

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
      mode = "bridge"

      port "collabora" {
      	to = 9980
      	host_network = "public"
      }
    }

    service {
      name = "office-{{ domain | replace('.', '-') }}"

      port = "collabora"

      provider = "nomad"

      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}"{% if not loop.last %},{% endif %}{% endfor %}]

    }

    task "collabora" {
      driver = "docker"

      config {
        image = "collabora/code:24.04.12.3.1"

          cap_add = ["MKNOD"]

      }

      template {
        data = <<EOH
ANSIBLE_FORCE_COLOR=TRUE

dictionaries=de_DE en_GB en_US es_ES fr_FR it nl pt_BR pt_PT ru

TZ=Europe/Paris

username={{ collabora_admin_user }}
password={{ collabora_admin_password }}

aliasgroup1=https://{{ domain }}

extra_params=--o:ssl.enable=false --o:ssl.termination=true

EOH
        destination = "secrets/file_group_04.env"
        env         = true
      }

      resources {
        cpu    = 1024
        memory = 1024
      }
    }
  }

  group "elasticsearch" {

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
      mode = "bridge"

      port "elasticsearch" {
        to = 9200
        static = 9200
        host_network = "internal"
      }
    }

    service {
      name = "elasticsearch"

      port = "elasticsearch"

      provider = "nomad"
    }

    task "elasticsearch" {
      driver = "docker"

      config {
        image = "elasticsearch:8.17.1"

        mount {
          type = "bind"
          target = "/usr/share/elasticsearch/data"
          source = "{{ software_path }}/data/usr/share/elasticsearch/data"
          readonly = false
          bind_options {
            propagation = "rshared"
          }
        }

        ports = ["elasticsearch"]
      }

      template {
        data = <<EOH
ANSIBLE_FORCE_COLOR=TRUE

discovery.type=single-node

ELASTIC_PASSWORD={{ elastic_password }}

cluster.name=docker-cluster

bootstrap.memory_lock=true

ES_JAVA_OPTS=-"Xms512m -Xmx512m"

xpack.security.enabled=false

xpack.security.http.ssl.enabled=false

EOH
        destination = "secrets/file_group_05.env"
        env         = true
      }

      resources {
        cpu    = 512
        memory = 1024
      }
    }
  }

  group "coturn" {

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
      mode = "host"

      port "coturn00" {
        to = 3478
        static = 3478
        host_network = "public"
      }
      port "coturn01" {
        to = 49160
        static = 49160
        host_network = "public"
      }
      port "coturn02" {
        to = 49161
        static = 49161
        host_network = "public"
      }
      port "coturn03" {
        to = 49162
        static = 49162
        host_network = "public"
      }
      port "coturn04" {
        to = 49163
        static = 49163
        host_network = "public"
      }
      port "coturn05" {
        to = 49164
        static = 49164
        host_network = "public"
      }
      port "coturn06" {
        to = 49165
        static = 49165
        host_network = "public"
      }
      port "coturn07" {
        to = 49166
        static = 49166
        host_network = "public"
      }
      port "coturn08" {
        to = 49167
        static = 49167
        host_network = "public"
      }
      port "coturn09" {
        to = 49168
        static = 49168
        host_network = "public"
      }
      port "coturn10" {
        to = 49169
        static = 49169
        host_network = "public"
      }
      port "coturn11" {
        to = 49170
        static = 49170
        host_network = "public"
      }
      port "coturn12" {
        to = 49171
        static = 49171
        host_network = "public"
      }
      port "coturn13" {
        to = 49172
        static = 49172
        host_network = "public"
      }
      port "coturn14" {
        to = 49173
        static = 49173
        host_network = "public"
      }
      port "coturn15" {
        to = 49174
        static = 49174
        host_network = "public"
      }
      port "coturn16" {
        to = 49175
        static = 49175
        host_network = "public"
      }
      port "coturn17" {
        to = 49176
        static = 49176
        host_network = "public"
      }
      port "coturn18" {
        to = 49177
        static = 49177
        host_network = "public"
      }
      port "coturn19" {
        to = 49178
        static = 49178
        host_network = "public"
      }
      port "coturn20" {
        to = 49179
        static = 49179
        host_network = "public"
      }
      port "coturn21" {
        to = 49180
        static = 49180
        host_network = "public"
      }
      port "coturn22" {
        to = 49181
        static = 49181
        host_network = "public"
      }
      port "coturn23" {
        to = 49182
        static = 49182
        host_network = "public"
      }
      port "coturn24" {
        to = 49183
        static = 49183
        host_network = "public"
      }
      port "coturn25" {
        to = 49184
        static = 49184
        host_network = "public"
      }
      port "coturn26" {
        to = 49185
        static = 49185
        host_network = "public"
      }
      port "coturn27" {
        to = 49186
        static = 49186
        host_network = "public"
      }
      port "coturn28" {
        to = 49187
        static = 49187
        host_network = "public"
      }
      port "coturn29" {
        to = 49188
        static = 49188
        host_network = "public"
      }
      port "coturn30" {
        to = 49189
        static = 49189
        host_network = "public"
      }
      port "coturn31" {
        to = 49190
        static = 49190
        host_network = "public"
      }
      port "coturn32" {
        to = 49191
        static = 49191
        host_network = "public"
      }
      port "coturn33" {
        to = 49192
        static = 49192
        host_network = "public"
      }
      port "coturn34" {
        to = 49193
        static = 49193
        host_network = "public"
      }
      port "coturn35" {
        to = 49194
        static = 49194
        host_network = "public"
      }
      port "coturn36" {
        to = 49195
        static = 49195
        host_network = "public"
      }
      port "coturn37" {
        to = 49196
        static = 49196
        host_network = "public"
      }
      port "coturn38" {
        to = 49197
        static = 49197
        host_network = "public"
      }
      port "coturn39" {
        to = 49198
        static = 49198
        host_network = "public"
      }
      port "coturn40" {
        to = 49199
        static = 49199
        host_network = "public"
      }
      port "coturn41" {
        to = 49200
        static = 49200
        host_network = "public"
      }
    }

    service {
      name = "coturn"

      port = "coturn00"

      provider= "nomad"
    }

    task "coturn" {
      driver = "docker"

      config {
        image = "coturn/coturn:4.6.3"

        mount {
          type = "bind"
          target = "/etc/turnserver.conf"
          source = "local/turnserver.conf"
          readonly = true
          bind_options {
            propagation = "rshared"
          }
        }
        mount {
          type = "tmpfs"
          target = "/var/lib/coturn"
          readonly = false
          tmpfs_options = {
            size = 100000
          }
        }

        ports = ["coturn00","coturn01","coturn02","coturn03","coturn04","coturn05","coturn06","coturn07","coturn08","coturn09","coturn10","coturn11","coturn12","coturn13","coturn14","coturn15","coturn16","coturn17","coturn18","coturn19","coturn20","coturn21","coturn22","coturn23","coturn24","coturn25","coturn26","coturn27","coturn28","coturn29","coturn30","coturn31","coturn32","coturn33","coturn34","coturn35","coturn36","coturn37","coturn38","coturn39","coturn40","coturn41"]
      }

      template {
        change_mode = "noop"
        destination = "local//turnserver.conf"
        data = <<EOH

listening-ip=0.0.0.0
listening-port=3478
fingerprint
use-auth-secret
realm=turn.{{ domain }}
total-quota=100
bps-capacity=0
stale-nonce
no-multicast-peers
min-port=49160
max-port=49200

static-auth-secret={{ coturn_password }}

EOH
      }


      template {
        data = <<EOH
ANSIBLE_FORCE_COLOR=TRUE

DETECT_EXTERNAL_IP=yes

DETECT_RELAY_IP=yes

EOH
        destination = "secrets/file_group_07.env"
        env         = true
      }

      resources {
        cpu    = 512
        memory = 1024
      }
    }
  }

}
