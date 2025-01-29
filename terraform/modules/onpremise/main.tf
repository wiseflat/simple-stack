resource "ansible_host" "instance" {

  name   = var.hostname
  groups = ["onpremise"]

  variables = {
    ansible_user                 = var.user_name
    ansible_host                 = var.public_ip
    hostname                     = var.hostname
    fqdn                         = var.hostname
    ansible_ssh_private_key_file = var.private_key
  }
}

resource "ansible_group" "infrastructure" {
  name     = "infrastructure"
  children = ["onpremise"]

  variables = {
  }
}

resource "ansible_group" "firewall" {
  name     = "firewall"
  children = ["onpremise"]

  variables = {
  }
}

resource "ansible_group" "docker" {
  name     = "docker"
  children = ["onpremise"]

  variables = {
  }
}
