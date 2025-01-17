# output "private_key" {
#   description = "Instance hostname"
#   value       = openstack_compute_keypair_v2.default.private_key
# }

output "access_ip_v4" {
  description = "Instance hostname"
  value       = openstack_compute_instance_v2.instance.access_ip_v4
}

# output "hostname" {
#   description = "Instance hostname"
#   value       = openstack_compute_instance_v2.instance.name
# }
