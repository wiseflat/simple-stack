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
      port "milvus_19530" {
        to = 19530
{% if software.static_port is defined %}
        static = {{ software.static_port }}
{% endif %}
      }
      port "milvus_9091" {
        to = 9091
      }
      port "milvus_2379" {
        to = 2379
      }
    }

    service {
      name = "{{ service_name }}-milvus"
      port = "milvus_19530"
      provider = "nomad"
    }

    service {
      name = "{{ service_name }}-webui"
      port = "milvus_9091"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
      check {
        type     = "http"
        path     = "/healthz"
        interval = "30s"
        timeout  = "20s"
      }
    }

    task "{{ domain }}-milvus" {
      driver = "docker"

      config {
        image = "milvusdb/milvus:v{{ softwares.milvus.version }}"
        security_opt = [
          "seccomp=unconfined"
        ]
        volumes = [
          "{{ software_path }}/var/lib/milvus:/var/lib/milvus:rw",
          "{{ software_path }}/milvus/config:/milvus/config:rw"
        ]
        ports = ["milvus_19530", "milvus_9091", "milvus_2379"]
        command = "milvus"
        args = [
          "run", "standalone"
        ]
      }

      env {
        TZ = "Europe/Paris"
        MILVUS_LOG_LEVEL = "info"
        ETCD_USE_EMBED = "true"
        ETCD_DATA_DIR = "/var/lib/milvus/etcd"
        ETCD_CONFIG_PATH = "/milvus/config/embedEtcd.yaml"
        COMMON_STORAGETYPE = "local"
        DEPLOY_MODE = "STANDALONE"
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
        memory_max = {{ size[software.size].memory * 2 }}
      }
    }
  }
}
