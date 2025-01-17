output "access_ip_v4" {
  description = "Instance hostname"
  value       = openstack_compute_instance_v2.instance.access_ip_v4
}
