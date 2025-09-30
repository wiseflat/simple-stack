# Simple Stack

Welcome to the Simple Stack project! This project demonstrates just how easy it can be to self-host web applications without complexity.

## Project Goals

- Deploy cloud infrastructure with Terraform (or add onpremise servers)
- Manage your servers with Ansible
- Orchestrate your docker containers workload with Nomad

---

## Project Structure

The project consists of two main components:

### **Terraform**

A straightforward Terraform configuration to deploy a standalone cloud instance across multiple providers (e.g., OVH, Infomaniak, AWS, Scaleway). The objective is to minimize cloud resource usage and keep the deployment lightweight.

### **Ansible**

A set of basic Ansible roles designed to configure and manage your server with minimal dependencies, reducing the need for frequent updates, limiting security vulnerabilities, and streamlining management.

### Features

**With this project, you get:**
- Simple container deployment using Ansible
- Basic container management with Ansible
- A lightweight control plane for orchestrating deployments
- Simple service discovery for your containers

---

## Prerequisites

You have two options for using this project:
1. **Direct Use**: Use this repository as-is to benefit from ongoing updates and minimal configuration.
2. **Fork and Contribute**: Fork this repository into your own GitHub namespace to add custom features. Feel free to contribute back to the community by submitting pull requests with your enhancements.

---

## Supported Cloud Providers

Currently, this code is compatible with **OVHcloud** and **Infomaniak** cloud providers, both offering OpenStack-based public cloud solutions. Be sure to download your OpenStack secrets file before beginning setup.

---

## Getting Started

To initialize the project, run:

```bash
make init
```

This command will initialize both Terraform and Ansible to prepare your instance and deploy your containers.

## Build (or download) a docker image

Several Ansible roles are available in this repository (Traefik, nginx, php-fpm, WordPress, MariaDB). Some of these roles use the latest version from Docker Hub, while others need to be built directly on the server.

```bash
make image
```

## Deploy a software

Once you have built your custom images, you can deploy one of them!

```bash
make deploy
```

Note: Ensure that an A record DNS entry points to your server. This step is not yet automated.

Once your domain will be deployed, a static yaml configuration file will be added on `host_vars/<instance_name>/<domain>.yml`. You can adapt it to add :

- a domain alias
- a restricted list of IP address to whitelist
- a HTTP basic authentication


## Operate on a software

Some applications may require maintenance tasks (such as backup, restoration, or restart), or may even need to be removed. This option covers those actions.

```bash
make operate
```

---

Thank you for exploring Simple Stack!
