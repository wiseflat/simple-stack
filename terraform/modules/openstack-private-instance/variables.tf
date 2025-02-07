variable "hostname" {
  description = "Hostname"
  default     = "instance01"
}

variable "network_name" {
  description = "Network Name"
  default     = "Ext-Net"
}

variable "flavor_name" {
  description = "Openstack flavor name"
  default     = "d2-2"
}

variable "image_id" {
  description = "Openstack image description"
}

variable "key_pair_id" {
  description = "Default key_pair id"
}

variable "network_id" {
  description = "Default network id"
}

variable "access_network" {
  description = "Default access_network"
}

variable "private_key" {
  description = "Default private key"
}

variable "region" {
  description = "Openstack region"
}

variable "user_name" {
  description = "Linux user name"
  default     = "ubuntu"
}

variable "groups" {
  description = "Ansible groups"
  default     = ["ovhcloud"]
}
