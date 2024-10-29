module "instance" {
  source = "./modules/openstack"

  for_each = var.instances
  
  hostname    = each.key
  region      = each.value.region
  flavor_name = each.value.flavor_name
  public_key  = file(each.value.public_key)
  private_key = each.value.private_key
}
