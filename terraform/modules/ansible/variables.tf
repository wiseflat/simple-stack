variable "hostname" {
  description = "Hostname"
  default     = "instance01"
}

variable "ansible_group" {
  description = "Ansible default group"
}

variable "public_ip" {
  description = "Public Ip address"
}

variable "private_key" {
  description = "Default private key"
}

variable "user_name" {
  description = "Linux user name"
  default     = "ubuntu"
}
