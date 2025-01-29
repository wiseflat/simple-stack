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

      image = "mariadb:{{ mariadb_version }}"

      volumes = [
        "{{ software_path }}/root:/root:ro",
        "{{ software_path }}/run/mysqld:/run/mysqld:rw",
        "{{ software_path }}/var/backup:/var/backup:rw"
      ]

      command = "/usr/bin/mariadb-dump"
      args = [
        "--all-databases",
        ">",
        "/var/backup/dump.sql"
      ]
    }
  }
}
