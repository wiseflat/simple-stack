variable "region" {
  description = "The id of the openstack region"
  type        = string
}

variable "public_key" {
  description = "Name of your project"
}

variable "private_key" {
  description = "Name of your project"
}

variable "name" {
  description = "Name of your project"
  default     = "demo"
}

variable "bastion" {
  description = "Bastion"
}

variable "instances" {
  description = "instances"
  type = object({
    name       = string
    groups     = set(string)
    region     = string
    public_key = string
  })
}
