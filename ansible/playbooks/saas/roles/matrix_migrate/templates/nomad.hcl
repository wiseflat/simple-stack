job "{{ domain }}" {
  region      = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type        = "batch"

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

  group "migrate" {

    count = 1

    restart {
      attempts = 0
      mode     = "fail"
    }

    task "{{ domain }}-migrate" {

      driver = "docker"

      config {
        image   = "python:3.12-slim"
        command = "bash"
        args    = ["/app/run.sh"]
        work_dir = "/tmp/migration"
        volumes = [
          "{{ software_path }}/migration:/tmp/migration",
          "local/migrate.py:/app/migrate.py:ro",
          "local/requirements.txt:/app/requirements.txt:ro",
          "local/run.sh:/app/run.sh:ro"
        ]
      }

      env {
        MATRIX_ADMIN_TOKEN = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='matrix_admin_token', missing='error') }}"
        MATRIX_APP_TOKEN   = "{{ lookup('simple-stack-ui', type='secret', key=domain, subkey='matrix_app_token', missing='error') }}"
      }

      template {
        change_mode = "restart"
        destination = "local/migrate.py"
        data        = <<EOH
{{ lookup('ansible.builtin.file', 'files/migrate.py') }}
  EOH
      }

      template {
        change_mode = "restart"
        destination = "local/requirements.txt"
        data        = <<EOH
{{ lookup('ansible.builtin.file', 'files/requirements.txt') }}
  EOH
      }

      template {
        change_mode = "restart"
        destination = "local/run.sh"
        perms       = "755"
        data        = <<EOH
#!/bin/bash
set -e

export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y --no-install-recommends libmagic1
pip install --root-user-action=ignore -r /app/requirements.txt

python /app/migrate.py \
  -i /tmp/migration/ \
  -n {{ software.matrix_server_name }} \
  {{ '-k' if software.nocertcheck | default(false) else '' }} \
  -f 2026-01-01
  EOH
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory | int }}
      }
    }
  }
}
