provider "openstack" {
  region = var.region
}

resource "openstack_compute_keypair_v2" "keypair" {
  name       = "${var.name}-keypair"
  public_key = file(var.public_key)
}

data "openstack_networking_network_v2" "public" {
  name = "Ext-Net"
}

resource "openstack_networking_secgroup_v2" "ingress" {
  name        = "${var.name} ingress rules"
  description = "${var.name} Ingress security group"
}

resource "openstack_networking_secgroup_rule_v2" "rules" {
  for_each = var.secgroup_rules

  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = each.value.port
  port_range_max    = each.value.port
  remote_ip_prefix  = each.value.cidr
  security_group_id = openstack_networking_secgroup_v2.ingress.id
}

# # private network
# resource "openstack_networking_network_v2" "private" {
#   name           = "${var.name}-network"
# }

data "openstack_images_image_v2" "default" {
  name        = "Ubuntu 24.04"
  most_recent = true
}

# resource "openstack_networking_subnet_v2" "subnet" {
#   name            = "${var.name}-subnet"
#   network_id      = data.openstack_networking_network_v2.public.id
#   cidr            = "192.168.199.0/24"
#   dns_nameservers = ["1.1.1.1", "8.8.8.8"]
#   ip_version      = 4
# }

module "instances" {
  source = "../modules/openstack-public-instance"

  for_each = var.instances

  hostname           = each.key
  groups             = each.value.groups
  region             = each.value.region
  flavor_name        = each.value.flavor_name
  image_id           = data.openstack_images_image_v2.default.id
  key_pair_id        = openstack_compute_keypair_v2.keypair.id
  network_id         = data.openstack_networking_network_v2.public.id
  access_network     = true
  private_key        = var.private_key
  security_group_ids = [openstack_networking_secgroup_v2.ingress.id]
}
