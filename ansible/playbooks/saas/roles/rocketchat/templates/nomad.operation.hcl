job "{{ domain }}-{{ operation }}" {
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

  task "{{ domain }}-{{ operation }}" {

    driver = "docker"

    config {
      image = "mongodb/mongodb-community-server:5.0.28-ubi8"
      volumes = [
          "{{ software_path }}/etc/mongodb:/etc/mongodb",
          "{{ software_path }}/var/lib/mongo:/var/lib/mongo",
          "{{ software_path }}/var/log/mongodb:/var/log/mongodb",
          "{{ software_path }}/var/run/mongod:/var/run/mongod",
          "{{ software_path }}/var/backup:/var/backup:rw"
      ]
      command = "sh"
      args    = ["-c", "{{ command }} {{ args }}"]
    }
  }
}
