job "{{ domain }}" {
  region = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type = "service"

{% if software.constraints is defined and software.constraints.location is defined %}
  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ software.constraints.location }}"
  }
{% endif %}

  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ software.instance }}"
  }

  group "{{ domain }}" {
    count = 1

    network {
      port "mariadb" {
        to = 3306
      }
      port "mysqld_exporter" {
        to = 9104
      }
    }

    // service name
    service {
      name = "{{ service_name }}"
      port = "mariadb"
      provider = "nomad"
    }

    // service name
    service {
      name = "mysql"
      port = "mariadb"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}"
      ]
    }

    // Exporter service name for metrology
    service {
      name = "mysqld-exporter"
      port = "mysqld_exporter"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}"
      ]
      check {
        type     = "tcp"
        port     = "mysqld_exporter"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit = 3
          grace = "90s"
          ignore_warnings = false
        }
      }
    }

    task "{{ domain }}-mysqld_exporter" {

      driver = "docker"

      config {

        image = "alpine:latest"

        volumes = [
          "/usr/local/bin:/usr/local/bin:ro",
          "{{ software_path }}/root:/root:ro",
          "{{ software_path }}/run/mysqld:/run/mysqld:rw"
        ]

        command = "/usr/local/bin/mysqld_exporter"
        args = [
          "--config.my-cnf",
          "/root/.my.cnf",
          "--log.level",
          "warn",
          "--collect.global_status",
          "--no-collect.info_schema.processlist",
          "--no-collect.slave_status",
          "--no-collect.info_schema.innodb_tablespaces",
          "--no-collect.info_schema.innodb_metrics",
          "--no-collect.info_schema.innodb_cmp",
          "--no-collect.engine_innodb_status",
          "--no-collect.info_schema.innodb_cmpmem"
        ]
        ports = ["mysqld_exporter"]
      }
    }

    task "{{ domain }}-mariadb" {

      driver = "docker"

      kill_signal = "SIGTERM"

      env {
        MARIADB_ROOT_HOST = "%"
        MARIADB_ROOT_PASSWORD = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='passwd', missing='error') }}"
        MARIADB_AUTO_UPGRADE = "true"
      }

      config {
        image = "mariadb:{{ softwares.mariadb.version }}"
        volumes = [
          "{{ software_path }}/var/lib/mysql:/var/lib/mysql:Z",
          "{{ software_path }}/etc/mysql/conf.d:/etc/mysql/conf.d:ro",
          "{{ software_path }}/var/backup:/var/backup:rw",
          "{{ software_path }}/root:/root:ro",
          "{{ software_path }}/run/mysqld:/run/mysqld:rw",
        ]
        ports = ["mariadb"]
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
