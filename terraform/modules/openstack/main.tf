data "openstack_images_image_v2" "default" {
  name        = var.image
  most_recent = true

  region = var.region
}

resource "openstack_compute_keypair_v2" "default" {
  name       = replace(var.hostname, ".", "-")
  public_key = var.public_key

  region = var.region
}

data "openstack_networking_network_v2" "default" {
  name = var.network_name

  region = var.region
}

resource "openstack_networking_port_v2" "default" {
  name               = var.hostname
  network_id         = data.openstack_networking_network_v2.default.id
  admin_state_up     = "true"
  security_group_ids = []

  region = var.region

  tags = []

  lifecycle {
    ignore_changes = [device_id, device_owner, qos_policy_id, tags]
  }
}

resource "openstack_compute_instance_v2" "instance" {
  name        = var.hostname
  image_id    = data.openstack_images_image_v2.default.id
  flavor_name = var.flavor_name
  key_pair    = openstack_compute_keypair_v2.default.id

  region = var.region

  network {
    access_network = true
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
ssh_authorized_keys:
  ${openstack_compute_keypair_v2.default.public_key}
final_message: "The system is finally up, after $UPTIME seconds"
EOF

  tags = []

  lifecycle {}
}

resource "ansible_host" "instance" {

  name   = var.hostname
  groups = ["ovhcloud"]

  variables = {
    ansible_user                 = var.user_name
    ansible_host                 = openstack_compute_instance_v2.instance.network[0].fixed_ip_v4
    hostname                     = var.hostname
    fqdn                         = var.hostname
    ansible_ssh_private_key_file = var.private_key
  }
}

resource "ansible_group" "infrastructure" {
  name     = "infrastructure"
  children = ["ovhcloud"]

  variables = {
  }
}

resource "ansible_group" "firewall" {
  name     = "firewall"
  children = ["ovhcloud"]

  variables = {
  }
}

resource "ansible_group" "docker" {
  name     = "docker"
  children = ["ovhcloud"]

  variables = {
  }
}
