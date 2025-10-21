job "{{ domain }}-llm" {
  region = "{{ fact_instance.region }}"
  datacenters = ["{{ fact_instance.datacenter }}"]
  type = "batch"

{% if software.constraints is defined and software.constraints.location is defined %}
  constraint {
    attribute    = "${meta.location}"
    set_contains = "{{ software.constraints.location }}"
  }
{% endif %}

{% if software.constraints is defined and software.constraints.instance is defined %}
  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ software.constraints.instance }}"
  }
{% endif %}

  group "{{ domain }}-llm" {
    count = 1

    volume "models" {
      type            = "csi"
      source          = "juicefs-llm"
      attachment_mode = "file-system"
      access_mode     = "multi-node-multi-writer"
    }

    task "{{ domain }}-vllm" {
      driver = "docker"

      template {
        change_mode = "restart"
        destination = "local/entrypoint.sh"
        perms = "755"
        data = <<EOH
{{ lookup('ansible.builtin.template', 'templates/entrypoint-llm.sh') }}
  EOH
      }

      env {
        HF_HOME = "/models"
        HF_TOKEN = "{{ software.hf_token }}"
        HF_HUB_DOWNLOAD_TIMEOUT = "60"
        HF_HUB_DISABLE_XET = "1"
        HF_HUB_ENABLE_HF_TRANSFER = "1"
        MODEL = "{{ software.model }}"
      }

      config {
        image = "alpine:latest"
        command = "/local/entrypoint.sh"
      }

      volume_mount {
        volume      = "models"
        destination = "/models"
      }

      resources {
        cpu    = {{ size[software.size].cpu }}
        memory = {{ size[software.size].memory }}
      }
    }
  }
}
