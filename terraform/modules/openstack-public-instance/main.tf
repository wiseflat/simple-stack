resource "openstack_networking_port_v2" "default" {
  name               = var.hostname
  network_id         = var.network_id
  admin_state_up     = "true"
  security_group_ids = var.security_group_ids

  region = var.region

  tags = []

  lifecycle {
    ignore_changes = [device_id, device_owner, qos_policy_id, tags]
  }
}

resource "openstack_compute_instance_v2" "instance" {
  name        = var.hostname
  image_id    = var.image_id
  flavor_name = var.flavor_name
  key_pair    = var.key_pair_id

  region = var.region

  network {
    access_network = var.access_network
    port           = openstack_networking_port_v2.default.id
  }

  stop_before_destroy = true

  metadata = {}

  user_data = <<EOF
#cloud-config
output: { all: "| tee -a /var/log/cloud-init-output.log" }
bootcmd:
 - systemctl stop snapd.service snapd.socket fwupd.service
 - systemctl disable snapd.service snapd.socket fwupd.service
package_upgrade: true
final_message: "The system is finally up, after $UPTIME seconds"
EOF

  tags = []

  lifecycle {
    ignore_changes = [image_id]
  }
}

resource "ansible_host" "host" {

  name   = var.hostname
  groups = var.groups

  variables = {
    ansible_user                 = var.user_name
    ansible_host                 = openstack_compute_instance_v2.instance.network[0].fixed_ip_v4
    hostname                     = var.hostname
    fqdn                         = var.hostname
    ansible_ssh_private_key_file = var.private_key
  }
}
