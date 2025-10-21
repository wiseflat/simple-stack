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

{% if software.constraints is defined and software.constraints.instance is defined %}
  constraint {
    attribute    = "${meta.instance}"
    set_contains = "{{ software.constraints.instance }}"
  }
{% endif %}

  group "{{ domain }}" {
    count = {{ software.scale | default(1) }}

    constraint {
      operator  = "distinct_hosts"
      value     = "true"
    }

    network {
      port "vllm" {
        to = 8000
      }
    }

    volume "models" {
      type            = "csi"
      source          = "juicefs-llm"
      attachment_mode = "file-system"
      access_mode     = "multi-node-multi-writer"
    }

    service {
      name = "{{ service_name }}"
      port = "vllm"
      provider = "nomad"
      tags = [
        {{ lookup('template', '../../traefik/templates/traefik_tag.j2') | indent(8) }}
      ]
      check {
        type     = "http"
        path     = "/v1/models"
        interval = "10s"
        timeout  = "2s"
      }
    }

    service {
      name = "vllm"
      port = "vllm"
      provider = "nomad"
      tags = [
        "fqdn:{{ domain }}",
        "host:{{ inventory_hostname }}",
      ]
    }

    task "{{ domain }}-vllm" {
      driver = "docker"

      env {
        HF_HOME = "/models"
        HF_TOKEN = "{{ software.hf_token }}"
        HUGGING_FACE_HUB_TOKEN = "{{ software.hf_token }}"
        VLLM_USE_V1 = "1"
        #VLLM_ALLREDUCE_USE_SYMM_MEM = "0"
        VLLM_DO_NOT_TRACK = "0"
        VLLM_USE_FLASHINFER_SAMPLER = "0"
        TORCH_CUDA_ARCH_LIST = "Ada"
        CUDA_VISIBLE_DEVICES = "0"
      }

      config {
        image = "vllm/vllm-openai:v{{ software.image_version | default(softwares.vllm.version) }}"
        ports = ["vllm"]
        ipc_mode = "host"

        volumes = [
          "{{ software_path }}/.config:/root/.config:rw",
          "{{ software_path }}/.cache:/root/.cache:rw"
        ]
        args = [{% for arg in software.args %}"{{ arg }}"{% if not loop.last %},{% endif %}{% endfor %}]
        work_dir = "/models"
      }

      volume_mount {
        volume      = "models"
        destination = "/models"
      }

      resources {
        cpu    = {{ size[software.size2 | default(software.size)].cpu }}
        memory = {{ size[software.size2 | default(software.size)].memory }}
        
        device "nvidia/gpu" {
          count = 1
          affinity {
            attribute = "${device.model}"
            operator  = "regexp"
            value     = "Tesla"
          }
        }
      }

    }
  }
}
