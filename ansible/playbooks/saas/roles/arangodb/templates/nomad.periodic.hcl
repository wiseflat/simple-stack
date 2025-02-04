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

    env {
      ARANGO_RANDOM_ROOT_PASSWORD = "{{ lookup('community.general.passwordstore', 'arangodb/' + domain) }}"
    }

    config {

      image = "{{ software }}:{{ ansible_local.software_version[software] }}"

      volumes = [
        "{{ software_path }}/var/lib/arangodb3:/var/lib/arangodb3:rw",
        "{{ software_path }}/var/lib/arangodb3-apps:/var/lib/arangodb3-apps:rw",
        "{{ software_path }}/var/backup:/var/backup:rw",
        "{{ software_path }}/run:/run:rw"
      ]

      command = "sh"
      args    = ["-c", "{{ command }} {{ args }}"]
    }
  }
}
