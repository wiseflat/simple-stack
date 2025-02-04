job "{{ domain }}" {
  region = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type = "service"

  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ fact_instance.location }}"
  }

  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ inventory_hostname }}"
  }

  group "{{ domain }}-mongodb" {
    count = 1

    network {
      port "mongodb" {
        to = 27017
      }
      port "exporter" {
        to = 9216
      }
    }

    service {
      name = "{{ service_name }}-mongodb"
      port = "mongodb"
      provider = "nomad"
      tags = [
      ]
      check {
        name     = "mongodb"
        type     = "tcp"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit = 3
          grace = "90s"
          ignore_warnings = false
        }
      }
    }

    service {
      name = "mongodb-exporter"
      port = "exporter"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}",
      ]
    }

    task "{{ domain }}-mongodb" {

      driver = "docker"

      config {
        image = "mongodb/mongodb-community-server:5.0.28-ubi8"

        volumes = [
            "{{ software_path }}/etc/mongodb:/etc/mongodb",
            "{{ software_path }}/var/lib/mongo:/var/lib/mongo",
            "{{ software_path }}/var/log/mongodb:/var/log/mongodb",
            "{{ software_path }}/var/run/mongod:/var/run/mongod",
            "{{ software_path }}/usr/local/bin:/usr/local/bin",
        ]

        entrypoint = ["/usr/local/bin/entrypoint.mongodb.sh"]
        ports = ["mongodb"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
        # memory_max = {{ size[software_vars.size].memory | default(64) | int * 4 }}
      }
    }

    task "{{ domain }}-mongodb_exporter" {
      driver = "docker"

      config {
        image   = "alpine:latest"
        volumes = [
          "/usr/local/bin:/usr/local/bin:ro"
        ]
        ports   = ["exporter"]
        command = "/usr/local/bin/mongodb_exporter"
        args    = [
          "--mongodb.uri=mongodb://${NOMAD_HOST_ADDR_mongodb}/admin"
        ]
      }

      resources {
        cpu    = 16
        memory = 32
      }
    }
  }

  group "{{ domain }}-rocketchat" {
    count = 1

    network {
      port "rocketchat" {
        to = 3000
      }
    }

    service {
      name = "{{ service_name }}-rocketchat"
      port = "rocketchat"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}"{% if not loop.last %},{% endif %}{% endfor %}]
      check {
        name     = "rocketchat"
        type     = "http"
        path     = "/"
        interval = "60s"
        timeout  = "30s"
        check_restart {
          limit = 3
          grace = "90s"
          ignore_warnings = false
        }
      }
    }

    task "{{ domain }}-rocketchat" {
      driver = "docker"

      env {
        ROOT_URL = "https://{{ domain }}"
        MONGO_URL = "mongodb://%2Fvar%2Frun%2Fmongod%2Fmongodb-27017.sock/parties?directConnection=true"
        MONGO_OPLOG_URL = "mongodb://%2Fvar%2Frun%2Fmongod%2Fmongodb-27017.sock/local?directConnection=true"
      }

      config {
        image   = "rocketchat/rocket.chat:{{ ansible_local.software_version[software] }}"
        volumes = [
          "{{ software_path }}/opt/rocketchat-stockage:/opt/rocketchat-stockage",
          "{{ software_path }}/var/run/mongod:/var/run/mongod"
        ]
        ports = ["rocketchat"]
      }
      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory | int * 2 }}
        # memory_max = {{ size[software_vars.size].memory | default(64) | int * 2 }}
      }
    }
  }

}
