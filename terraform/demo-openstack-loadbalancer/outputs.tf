output "instances" {
  description = "List of instances"
  value = [
    for instance in module.instances : instance.access_ip_v4
  ]
}
