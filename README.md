# Simple Stack

![GitHub stars](https://img.shields.io/github/stars/your-repo/simple-stack?style=flat)
![License](https://img.shields.io/github/license/your-repo/simple-stack)

**Simple Stack** is a reference implementation that shows how to self‑host modern web applications with minimal operational overhead. It combines Terraform for infrastructure, Ansible for configuration, and a lightweight UI for management.

## Philosophy

- **Simplicity first** – every component can be understood in a few minutes.  
- **Transparency** – all code is declarative and version‑controlled.  
- **Portability** – works on any major cloud provider or on‑premise hardware.  
- **Extensibility** – add new services by extending the existing Ansible roles or Terraform modules.

## Project Goals

The project aims to give SREs and developers a solid, opinionated foundation for:

- Managing and deploying cloud infrastructure with a mainstream IaC tool.  
- Configuring servers using a widely adopted automation framework.  
- Orchestrating the full application lifecycle with containers.  
- Scaling up/down horizontally or vertically with proven patterns.

## Project Structure

The repository is organised into three logical layers:

### IaC – Terraform

Terraform modules provision a single compute instance on providers such as **OVHcloud**, **Infomaniak**, **AWS**, **Scaleway**, etc. The goal is to keep the footprint small while remaining provider‑agnostic.

### Configuration – Ansible

Ansible roles install Docker, pull the required images and configure the host. Roles are deliberately minimal to reduce attack surface and maintenance effort.

### SaaS – UI

A small web UI (the `ui/` directory) lets you create projects, store all variables and trigger deployments without writing additional scripts.

## Features

- One‑click container deployment via Ansible.  
- Basic container lifecycle management.  
- Lightweight control plane for orchestrating deployments.  
- Self‑hosted web UI for project administration.


## Contributing

Contributions are welcome! Please:

- Fork the repository.  
- Create a feature branch.  
- Ensure code follows the existing style and passes `make lint`.  
- Open a Pull Request with a clear description of the change.

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

## Acknowledgements

Thanks to the open‑source community for the tools that make this stack possible: Terraform, Ansible, Docker and the many contributors of the underlying roles.
