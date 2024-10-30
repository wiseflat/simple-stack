terraform {
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "1.52.1"
    }
    ansible = {
      source  = "ansible/ansible"
      version = "1.3.0"
    }
  }
  required_version = ">= 1.0.8"
}
