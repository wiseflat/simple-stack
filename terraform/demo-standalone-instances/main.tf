resource "ansible_host" "host" {

  for_each = var.instances

  name   = each.key
  groups = each.value.groups

  variables = {
    ansible_user                 = each.value.username
    ansible_host                 = each.value.public_ip
    hostname                     = each.key
    fqdn                         = each.key
    ansible_ssh_private_key_file = each.value.private_key
  }
}
