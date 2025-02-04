job "{{ domain }}-periodic" {
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
    crons = [
      "{{ 60 | random(seed=domain) }} {{ 24 | random(seed=domain) }} * * * *"
    ]
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

      command = "sh"
      args    = ["-c", "{{ command }} {{ args }}"]
    }
  }
}
