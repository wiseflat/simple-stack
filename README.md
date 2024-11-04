# Simple Stack

Welcome to the Simple Stack project! This project demonstrates just how easy it can be to self-host web applications without unnecessary complexity or hassle.

## Project Goals

Cloud application hosting has become increasingly complex, with container orchestrators often seen as essential for deploying containerized applications. However, this project aims to show that orchestrators are not always necessary. You don’t need Kubernetes, Nomad, or any other container orchestrator to deploy monolithic applications like WordPress, Ghost, or similar platforms.

The essential mechanisms for deploying containers can be achieved with minimal setup. Here, we use **Ansible** to orchestrate deployments simply and effectively.

Once in production, a cloud instance can maintain itself independently, updating both the server and applications without regular maintenance. This self-sufficiency is the core objective of the Simple Stack project.

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

**This project does NOT include:**
- Complex container orchestrators (K3s, K8s, Nomad, Swarm, etc.)
- Blue/green or canary deployment strategies
- Distributed storage solutions

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

Initialize the project by running:

```bash
make init
```

This command will initialize both Terraform and Ansible to prepare your instance and deploy your containers.

---

Thank you for exploring Simple Stack!
