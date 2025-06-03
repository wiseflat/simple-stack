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

  group "{{ domain }}" {
    count = 1

    network {
      port "web" {
        static = 8043
      }

      port "postgres" {
        to = 5432
        static = 5432
      }

      # port "redis" {
      #   to = 6379
      # }
    }

    service {
      name = "{{ service_name }}"
      port = "web"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
    }

    task "postgres" {
      driver = "docker"

      env {
        POSTGRES_DB       = "{{ database_username }}"
        POSTGRES_USER     = "{{ database_name }}"
        POSTGRES_PASSWORD = "{{ database_password }}"
      }

      config {
        image = "postgres:13"
        ports = ["postgres"]
        volumes = [
          "{{ software_path }}/awx-postgres:/var/lib/postgresql/data"
        ]
      }

      resources {
        cpu    = 500
        memory = 512
      }
    }

    task "redis" {
      driver = "docker"

      config {
        image = "redis:7"
        volumes = [
          "{{ software_path }}/etc/redis:/etc/redis:ro",
          "{{ software_path }}/var/run/redis:/var/run/redis:rw"
        ]
        args = [
          "/etc/redis/redis.conf"
        ]
        # ports = ["redis"]
      }

      resources {
        cpu    = 300
        memory = 256
      }
    }

    task "awx-web" {
      lifecycle {
        hook = "poststart"
      }

      driver = "docker"

      config {
        image = "quay.io/ansible/awx:24.6.1"
        ports = ["web"]
        volumes = [
          "{{ software_path }}/awx-static-files:/var/lib/awx/public:rw",
          "{{ software_path }}/etc/tower:/etc/tower:rw",
          # "{{ software_path }}/etc/nginx/conf.d:/etc/nginx/conf.d:ro",
          "{{ software_path }}/etc/nginx.conf:/etc/nginx.conf:ro",
          "{{ software_path }}/run:/run:rw",
          "{{ software_path }}/var/run:/var/run:rw",
          "{{ software_path }}/etc/supervisord_web.conf:/etc/supervisord_web.conf:ro"
        ]
        command = "/usr/bin/launch_awx_web.sh"
      }

      env {
        AWX_SKIP_MIGRATIONS=true
        SECRET_KEY        = "a_super_secret_key"
        # DATABASE_ENGINE   = "django.db.backends.postgresql"
        DATABASE_USER     = "{{ database_username }}"
        DATABASE_NAME     = "{{ database_name }}"
        DATABASE_PASSWORD = "{{ database_password }}"
        DATABASE_HOST     = "${NOMAD_IP_postgres}"
        DATABASE_PORT     = "${NOMAD_HOST_PORT_postgres}"
        # REDIS_HOST        = "${NOMAD_IP_redis}"
        # REDIS_PORT        = "${NOMAD_HOST_PORT_redis}"
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }

      # service {
      #   name = "awx"
      #   port = "web"

      #   tags = [
      #     "traefik.enable=true",
      #     "traefik.http.routers.awx.rule=Host(`awx.local`)",
      #     "traefik.http.services.awx.loadbalancer.server.port=8043"
      #   ]
      # }
    }

    task "awx-task" {
      lifecycle {
        hook = "poststart"
      }

      driver = "docker"

      config {
        image = "quay.io/ansible/awx:24.6.1"
        volumes = [
          "{{ software_path }}/awx-task-projects:/var/lib/awx/projects"
        ]
        command = "/usr/bin/launch_awx_task.sh"
      }

      env {
        AWX_SKIP_MIGRATIONS=true
        SECRET_KEY        = "a_super_secret_key"
        DATABASE_USER     = "{{ database_username }}"
        DATABASE_NAME     = "{{ database_name }}"
        DATABASE_PASSWORD = "{{ database_password }}"
        DATABASE_HOST     = "${NOMAD_IP_postgres}"
        DATABASE_PORT     = "${NOMAD_HOST_PORT_postgres}"
        # REDIS_HOST        = "${NOMAD_IP_redis}"
        # REDIS_PORT        = "${NOMAD_HOST_PORT_redis}"
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
