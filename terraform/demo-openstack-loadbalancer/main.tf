provider "openstack" {
  region = var.region
}

data "openstack_networking_network_v2" "public" {
  name = "Ext-Net"
}

resource "openstack_networking_network_v2" "network" {
  name = "${var.name}-network"
}

resource "openstack_networking_subnet_v2" "subnet" {
  name            = "${var.name}-subnet"
  network_id      = openstack_networking_network_v2.network.id
  cidr            = "192.168.199.0/24"
  dns_nameservers = ["1.1.1.1", "8.8.8.8"]
  ip_version      = 4
}

resource "openstack_networking_router_v2" "router" {
  name                = "${var.name}-router"
  external_network_id = data.openstack_networking_network_v2.public.id
}

resource "openstack_networking_router_interface_v2" "router-subnet" {
  router_id = openstack_networking_router_v2.router.id
  subnet_id = openstack_networking_subnet_v2.subnet.id
}

resource "openstack_networking_port_v2" "port-pub" {
  name       = "${var.name}-port-pub"
  network_id = data.openstack_networking_network_v2.public.id
}

resource "openstack_networking_floatingip_v2" "fip" {
  pool = "Ext-Net"
}

resource "openstack_networking_secgroup_v2" "ingress" {
  name        = "Bastion ingress rules"
  description = "Ingress security group"
}

resource "openstack_networking_secgroup_rule_v2" "bastion" {

  count = length(var.bastion.restricted_ips)

  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = "22"
  port_range_max    = "22"
  remote_ip_prefix  = var.bastion.restricted_ips[count.index]
  security_group_id = openstack_networking_secgroup_v2.ingress.id
}

resource "openstack_networking_port_v2" "port" {
  name       = "${var.name}-port"
  network_id = openstack_networking_network_v2.network.id

  security_group_ids = [openstack_networking_secgroup_v2.ingress.id]

  fixed_ip {
    subnet_id = openstack_networking_subnet_v2.subnet.id
  }
}

resource "openstack_networking_floatingip_associate_v2" "fip" {
  floating_ip = openstack_networking_floatingip_v2.fip.address
  port_id     = openstack_networking_port_v2.port.id
  depends_on = [
    openstack_networking_router_interface_v2.router-subnet,
  ]
}

resource "openstack_compute_keypair_v2" "keypair" {
  name       = "${var.name}-keypair"
  public_key = file(var.public_key)
}

data "openstack_images_image_v2" "default" {
  name        = "Ubuntu 24.04"
  most_recent = true
}

resource "openstack_compute_instance_v2" "bastion" {

  name        = var.bastion.name
  flavor_name = "d2-2"
  image_id    = data.openstack_images_image_v2.default.id
  key_pair    = openstack_compute_keypair_v2.keypair.id

  network {
    port = openstack_networking_port_v2.port.id
  }

  stop_before_destroy = true
}

resource "ansible_host" "host" {

  name   = var.bastion.name
  groups = var.bastion.groups

  variables = {
    ansible_user                 = "ubuntu"
    ansible_host                 = openstack_networking_floatingip_associate_v2.fip.floating_ip
    hostname                     = var.bastion.name
    fqdn                         = var.bastion.name
    ansible_ssh_private_key_file = var.private_key
  }
}

module "instances" {
  source = "../modules/openstack-private-instance"

  for_each = var.instances

  hostname       = each.key
  groups         = each.value.groups
  region         = each.value.region
  flavor_name    = each.value.flavor_name
  image_id       = data.openstack_images_image_v2.default.id
  key_pair_id    = openstack_compute_keypair_v2.keypair.id
  network_id     = openstack_networking_network_v2.network.id
  access_network = false
  private_key    = var.private_key
}

data "openstack_loadbalancer_flavor_v2" "flavor" {
  name = "small"
}

resource "openstack_networking_floatingip_v2" "public-fip" {
  pool = "Ext-Net"
}

resource "openstack_networking_floatingip_associate_v2" "public-fip-association" {
  floating_ip = openstack_networking_floatingip_v2.public-fip.address
  port_id     = openstack_lb_loadbalancer_v2.http.vip_port_id
}

resource "openstack_lb_loadbalancer_v2" "http" {
  name          = "elastic_loadbalancer_http"
  vip_subnet_id = openstack_networking_subnet_v2.subnet.id
  flavor_id     = data.openstack_loadbalancer_flavor_v2.flavor.id
}

resource "openstack_lb_listener_v2" "http" {
  name            = "listener_http"
  protocol        = "TCP"
  protocol_port   = 80
  loadbalancer_id = openstack_lb_loadbalancer_v2.http.id
}

resource "openstack_lb_pool_v2" "http" {
  name        = "pool_http"
  protocol    = "TCP"
  lb_method   = "LEAST_CONNECTIONS"
  listener_id = openstack_lb_listener_v2.http.id
}

resource "openstack_lb_member_v2" "http" {

  for_each = var.instances

  name          = each.key
  address       = module.instances[each.key].access_ip_v4
  protocol_port = 80
  pool_id       = openstack_lb_pool_v2.http.id
  subnet_id     = openstack_networking_subnet_v2.subnet.id
  depends_on    = [openstack_lb_pool_v2.http]
}

resource "openstack_lb_monitor_v2" "http" {
  name        = "monitor_http"
  pool_id     = openstack_lb_pool_v2.http.id
  type        = "TCP"
  delay       = 2
  timeout     = 2
  max_retries = 2
  depends_on  = [openstack_lb_member_v2.http]
}
