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

  group "nginx" {
    count = {{ software_vars.scale | default(1) }}

    network {
      port "nginx" {
        to = 80
      }
      port "exporter" {
        to = 9113
      }
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
        image = "nginx:{{ hostvars[inventory_hostname].softwares.nginx }}"
        volumes = [
          "{{ software_path }}/var/www/html:/var/www/html:ro",
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
          "http://{% raw %}{{ env NOMAD_ADDR_nginx }}{% endraw %}/stub_status"
        ]
      }

      resources {
        cpu    = 16
        memory = 16
      }
    }
  }
}
