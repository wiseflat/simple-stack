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
      # port "awx" {
      #   to = 8052
      # }
      port "ui" {
        static = 8043
      }
      port "api" {
        static = 8053
      }
    }

    service {
      name = "{{ service_name }}"
      port = "ui"
      provider = "nomad"
      tags = [{% for label in traefik_labels_result.labels %}"{{ label }}",{% endfor %}]
    }

    task "{{ domain }}-awx" {
      driver = "docker"

      # env {
      #   SEMAPHORE_DB_DIALECT = "bolt"
      #   SEMAPHORE_ADMIN = "{{ software_vars.username }}"
      #   SEMAPHORE_ADMIN_PASSWORD = "{{ lookup('community.general.passwordstore', 'semaphoreui/' + domain, missing='create', subkey='passwd', nosymbols=true, length=8) }}"
      #   SEMAPHORE_ADMIN_NAME = "{{ software_vars.username }}"
      #   SEMAPHORE_ADMIN_EMAIL = "{{ software_vars.email }}"
      # }

      config {
        image = "ghcr.io/ansible/awx_devel:devel"
        privileged = true
        tty = true
        interactive = true
        volumes = [
          "/dev/fuse:/dev/fuse:rw",
          # "{{ software_path }}/var/lib/containers/storage/overlay:/var/lib/containers/storage/overlay:rw"
        ]
        # cap_add = ["audit_write", "chown", "dac_override", "fowner", "fsetid", "kill", "mknod", "net_bind_service", "setfcap", "setgid", "setpcap", "setuid", "sys_chroot", "sys_ptrace", "sys_admin"]
        cap_add = ["audit_write", "chown", "dac_override", "fowner", "fsetid", "kill", "mknod", "net_bind_service", "setfcap", "setgid", "setpcap", "setuid", "sys_chroot", "sys_ptrace", "sys_admin"]
        ports = ["ui", "api"]
      }

      resources {
        cpu    = {{ size[software_vars.size].cpu }}
        memory = {{ size[software_vars.size].memory }}
      }
    }
  }
}
