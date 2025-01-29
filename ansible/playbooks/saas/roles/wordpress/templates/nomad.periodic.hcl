job "{{ domain }}-backup" {
  region = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type = "batch"

  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ fact_instance.location }}"
  }

  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ inventory_hostname }}"
  }

  periodic {
    cron = "{{ 60 | random }} {{ 24 | random }} * * * *"
    prohibit_overlap = true
  }

  task "{{ domain }}-backup" {

    driver = "docker"

    config {

      image = "phpfpm-wordpress:{{ ansible_local.software_version['phpfpm-wordpress'] }}"

      volumes = [
        "/data/{{ software_vars.dbhost }}/run/mysqld:/run/mysqld:ro",
        "{{ software_path }}/var/www/html:/var/www/html:ro",
        "{{ software_path }}/var/backup:/var/backup:rw"
      ]

      command = "wp-cli"
      args = [
        "db",
        "export",
        "--allow-root",
        "--path=/var/www/html",
        "/var/backup/dump.sql"
      ]
    }

    resources {
      cpu    = 16
      memory = 32
    }
  }
}
