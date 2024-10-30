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

variable "image" {
  description = "Openstack image description"
  default     = "Ubuntu 24.04"
}

variable "public_key" {
  description = "Default public key"
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
