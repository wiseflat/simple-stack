variable "name" {
  description = "The name of the project to be deployed."
  default     = "demo"
}

variable "region" {
  description = "The OpenStack region to deploy resources in."
  type        = string
}

variable "public_key" {
  description = "The local SSH public key used for instance access."
}

variable "private_key" {
  description = "The local SSH private key used for instance access."
}

variable "secgroup_rules" {
  description = "A map of security group rules to control network access to instances."
}

variable "instances" {
  description = "A map defining OpenStack instances with their configurations."
  default     = {}
}
