job "{{ domain }}" {
  region      = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type        = "service"

  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ fact_instance.location }}"
  }

  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ inventory_hostname }}"
  }

  group "phpfpm" {
    count = {{ software_vars.scale.phpfpm }}

    network {
      port "exporter" {
        to = 9253
      }
    }

    service {
      name = "phpfpm-exporter"
      port = "exporter"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}",
      ]
    }

    task "{{ domain }}-phpfpm" {

      driver = "docker"

      env {
        WORDPRESS_DB_PASSWORD="{{ lookup('community.general.passwordstore', 'mariadb/' + domain, subkey='passwd', missing='create', length=12, userpass=software_vars.userpass | default(none)) }}"
      }

      config {
        image = "phpfpm-wordpress:{{ ansible_local.software_version['phpfpm-wordpress'] }}"

        volumes = [
          "{{ software_path }}/etc/php-fpm.d:/etc/php{{ ansible_local.software_version['phpfpm-wordpress'].split('.')[:2] | join('') }}/php-fpm.d:ro",
          "{{ software_path }}/var/www/html:/var/www/html:rw",
          "{{ software_path }}/var/run/php-fpm:/run/php-fpm:rw",
          "{{ software_path }}/var/log/php-fpm:/var/log/php-fpm:rw",
          "/data/{{ software_vars.dbhost }}/run/mysqld:/run/mysqld:ro"
        ]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory | int }}
        # memory_max = {{ size[software_vars.size].memory * 2 }}
      }
    }

    task "{{ domain }}-phpfpm-exporter" {

      driver = "docker"

      config {
        image   = "alpine:latest"
        volumes = [
          "/usr/local/bin:/usr/local/bin:ro",
          "{{ software_path }}/var/run/php-fpm:/var/run/php-fpm:rw"
        ]
        ports   = ["exporter"]

        command      = "sh"
        args         = ["-c", "/usr/local/bin/php-fpm_exporter server --phpfpm.scrape-uri='unix:///var/run/php-fpm/www-${NOMAD_ALLOC_INDEX}.sock;/status' --phpfpm.fix-process-count=true"]
      }

      resources {
        cpu    = 16
        memory = 32
      }
    }
  }

  group "nginx" {
    count = {{ software_vars.scale.nginx }}
    
    network {
      port "nginx" {
        to = 80
      }
      port "exporter" {
        to = 9113
      }
    }

    update {
      max_parallel      = 1
      health_check      = "checks"
      min_healthy_time  = "10s"
      healthy_deadline  = "30s"
      progress_deadline = "60s"
      auto_revert       = true
      auto_promote      = true
      canary            = 1
      stagger           = "30s"
    }

    service {
      name = "{{ service_name }}-nginx"
      port = "nginx"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}"{% if not loop.last %},{% endif %}{% endfor %}]
      # check {
      #   name     = "{{ service_name }}"
      #   type     = "http"
      #   path     = "/"
      #   interval = "60s"
      #   timeout  = "30s"
      #   check_restart {
      #     limit = 3
      #     grace = "90s"
      #     ignore_warnings = false
      #   }
      # }
    }

    service {
      name = "nginx-exporter"
      port = "exporter"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}",
      ]
    }

    task "{{ domain }}-nginx" {

      driver = "docker"

      config {
        image = "nginx:{{ ansible_local.software_version['nginx'] }}"
        volumes = [
          "{{ software_path }}/var/www/html:/var/www/html:ro",
          "{{ software_path }}/var/run/php-fpm:/var/run/php-fpm:ro",
          "{{ software_path }}/var/log/nginx:/var/log/nginx:rw",
          "{{ software_path }}/etc/nginx/sites-enabled:/etc/nginx/sites-enabled:ro"
        ]
        ports = ["nginx"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory | int }}
        # memory_max = {{ size[software_vars.size].memory * 2 }}
      }
    }

    task "{{ domain }}-nginx-exporter" {

      driver = "docker"

      config {
        image   = "alpine:latest"
        volumes = [
          "/usr/local/bin:/usr/local/bin:ro",
          "{{ software_path }}/var/run/php-fpm:/var/run/php-fpm:rw"
        ]
        ports   = ["exporter"]

        command = "/usr/local/bin/nginx-prometheus-exporter"
        args    = [
          "--nginx.scrape-uri",
          "http://${NOMAD_ADDR_nginx}/stub_status"
        ]
      }

      resources {
        cpu    = 16
        memory = 16
      }
    }
  }
}
