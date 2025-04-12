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

  group "{{ domain }}-rocketchat" {
    count = 1

    network {
      port "mongodb" {
        to = 27017
      }
      port "exporter" {
        to = 9216
      }
      port "rocketchat" {
        to = 3000
      }
    }

    service {
      name = "{{ service_name }}-mongodb"
      port = "mongodb"
      provider = "nomad"
      tags = []
    }

    service {
      name = "mongodb-exporter"
      port = "exporter"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}"
      ]
    }

    service {
      name = "{{ service_name }}-rocketchat"
      port = "rocketchat"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}"{% if not loop.last %},{% endif %}{% endfor %}]
    }

    task "{{ domain }}-mongodb" {
      driver = "docker"

      config {
        image = "docker.io/bitnami/mongodb:7.0.15"

        volumes = [
          "{{ software_path }}/data/bitnami/mongodb:/bitnami/mongodb"
        ]
        ports = ["mongodb"]
      }

      template {
        data = <<EOH
MONGODB_SYSTEM_LOG_VERBOSITY=0
MONGODB_REPLICA_SET_MODE=primary
MONGODB_REPLICA_SET_NAME=rs0
MONGODB_INITIAL_PRIMARY_HOST=127.0.0.1
MONGODB_ADVERTISED_HOSTNAME=127.0.0.1
MONGODB_ENABLE_JOURNAL=true
ALLOW_EMPTY_PASSWORD=yes
EOH
        destination = "secrets/mongo.file.env"
        env         = true
        change_mode   = "restart"
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory * 3 }}
        memory_max = {{ size[software_vars.size].memory | default(64) | int * 4 }}
      }
    }

    task "{{ domain }}-mongodb_exporter" {
      driver = "docker"

      config {
        image   = "alpine:latest"
        volumes = [
          "/usr/local/bin/mongodb_exporter:/usr/local/bin/mongodb_exporter:ro"
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

    task "{{ domain }}-rocketchat" {
      driver = "docker"

      env {
        ROOT_URL = "https://{{ domain }}"
        MONGO_URL = "mongodb://${NOMAD_HOST_ADDR_mongodb}/parties?replicaSet=rs0&directConnection=true"
        MONGO_OPLOG_URL = "mongodb://${NOMAD_HOST_ADDR_mongodb}/local?replicaSet=rs0&directConnection=true"
        PORT = "3000"
        DEPLOY_METHOD = "docker"
        HTTP_FORWARDED_COUNT = "1"
      }

      config {
        image   = "rocketchat/rocket.chat:{{ ansible_local.software_version[software] }}"
        ports = ["rocketchat"]
      }
      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory | int * 2 }}
        memory_max = {{ size[software_vars.size].memory | int * 4 }}
      }
    }
  }

}
