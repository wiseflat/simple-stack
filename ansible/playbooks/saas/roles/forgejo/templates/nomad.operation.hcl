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

    env {
      USER_UID = "1000"
      USER_GID = "1000"
      APP_DATA_PATH = "/data"
      FORGEJO_WORK_DIR = "/data"
    }

    config {

      image = "{{ software }}:{{ ansible_local.software_version[software] }}"

      volumes = [
        "{{ software_path }}/data:/data:rw",
        "{{ software_path }}/var/backup:/var/backup:rw",
        "{{ software_path }}/var/log:/var/log:rw",
        "/etc/timezone:/etc/timezone:ro",
        "/etc/localtime:/etc/localtime:ro",
        "/data/{{ software_vars.dbhost }}/run/mysqld:/run/mysqld:ro"
      ]

      command = "{{ command }}"
      args    = [{% for arg in args %}"{{ arg }}",{% endfor %}]
    }
  }
}
