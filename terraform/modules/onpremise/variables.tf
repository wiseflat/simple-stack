variable "hostname" {
  description = "Hostname"
  default     = "instance01"
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
