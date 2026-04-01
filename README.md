# Wiseflat Simple Stack

![GitHub stars](https://img.shields.io/github/stars/wiseflat/simple-stack?style=flat)
![License](https://img.shields.io/github/license/wiseflat/simple-stack)

**Simple Stack** is an integrated platform for running your entire stack — from infrastructure to applications to observability — on your own hardware or cloud accounts. No more vendor lock-in, no more scattered configuration across a dozen tools.

---

## The Problem

You want to host your own infrastructure and applications, but you don't want to:

- Manually manage Terraform state files and infrastructure versions
- Write deployment scripts every time you add a new service
- Cobble together monitoring solutions across multiple dashboards
- Lose visibility into what's actually running on your servers

## The Solution: One Integrated Platform

Simple Stack unifies the entire deployment pipeline in a single, self-hosted interface:

```
Terraform States → Ansible Playbooks → Docker Registry → Application Deployments → Full Observability
   (IaaS)             (PaaS)            (Catalog)               (SaaS)               (Built-in)
```

---

## Your Journey: From Infrastructure to Production

### **1. Infrastructures – Define Your Foundation (IaaS)**

Start by importing or provisioning your cloud infrastructure:

- Store Terraform state files directly in Simple Stack's database
- Manage infrastructure versions and changes through a web interface
- Support for any Terraform provider: AWS, OVHcloud, Scaleway, on-premise, etc.
- Versioned history of all infrastructure changes

**Result:** Your infrastructure is now version-controlled, auditable, and reproducible.

---

### **2. Platforms & Configuration – Setup Your Servers (PaaS)**

Define how your servers should be configured:

- Use Ansible playbooks to install Docker and core dependencies
- Deploy and manage system-level services (databases, proxies, etc.)
- Nomad orchestrates the PaaS layer for you
- Pre-built roles for observability stack (Prometheus, Loki, Grafana)

**Result:** Every new server gets the same solid, observability-ready foundation.

---

### **3. Catalogs – Build Your Applications**

Create reusable application containers:

- Define service templates for your team to use
- Store Docker images in your own private registry (self-hosted)
- Share catalogs across projects using fork/inheritance patterns
- Document dependencies and environment requirements

**Result:** A curated library of production-ready services, no external dependencies.

---

### **4. Softwares – Deploy & Manage**

Deploy applications on your infrastructure:

- Choose which catalog items to deploy onto which servers
- Configure variables, secrets, and per-environment overrides
- Trigger deployments from the UI, no scripting required
- Track deployment history and operational actions

**Result:** Modern application management meets your own infrastructure.

---

### **5. Observability – See Everything**

Monitor and troubleshoot your entire stack:

- **Prometheus** for metrics collection across all infrastructure
- **Loki** for log aggregation from all services and applications
- **Grafana** for unified dashboards and alerting
- All deployed and managed automatically as part of the PaaS foundation

**Result:** End-to-end visibility without extra tools or vendor accounts.

---

## Why Simple Stack?

✅ **Self-Hosted** – Full control. No SaaS dependencies.
✅ **Unified** – One interface for infrastructure, configuration, and deployments.
✅ **Declarative** – All changes are version-controlled, auditable, and reproducible.
✅ **Extensible** – Add new services by extending Terraform, Ansible, or the Docker catalog.
✅ **Transparent** – No hidden magic. Every decision is documented and open.

---

## Quick Start

### Prerequisites

- A cloud account (AWS, OVHcloud, Scaleway, etc.) or on-premise hardware
- Docker and Node.js installed locally for development
- A Git repository to version-control your infrastructure and configurations

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/simple-stack.git
   cd simple-stack
   ```

2. **Deploy the platform**
   ```bash
   cd terraform/demo-standalone-instances
   terraform init && terraform apply
   ```

3. **Access the web UI**
   ```
   https://your-domain.com
   ```

4. **Import or create your first infrastructure**
   - Upload a Terraform state file, or
   - Use the built-in Terraform templates

---

## Documentation

More detailed guides are available in `/docs`:

- **Intro** – Platform overview and mental model
- **Basic Usage** – First steps with Simple Stack
- **Infrastructures** – Deep dive into IaaS and Terraform
- **Catalogs** – Building and managing your application library
- **Softwares** – Deploying and managing services

Full documentation with examples: https://your-domain.com/docs

---

## Project Structure

```
simple-stack/
├── terraform/              # IaaS – Cloud infrastructure provisioning
│   ├── modules/
│   └── demo-*-instances/   # Example deployments
├── ansible/                # PaaS – Server configuration & observability
│   ├── playbooks/
│   ├── roles/
│   └── rulebook.yml        # Event-driven automation (Ansible Runner)
├── ui/                     # Legacy SaaS UI (being migrated to ui-next)
└── ui-next/                # New Next.js SaaS management platform
    ├── app/                # Application pages & API routes
    ├── components/         # Reusable React components
    ├── lib/                # Shared logic and database layer
    └── content/docs/       # Markdown documentation
```

---

## Architecture Highlights

### Three Layers

**IaC Layer (Terraform)**
Provisions compute, networking, and storage resources on any mainstream cloud provider.

**Config Layer (Ansible)**
Installs Docker, system services, and the observability stack on provisioned hosts.

**UI Layer (Next.js + SQLite)**
Provides a unified interface for managing infrastructure, deployments, and operations.

### Built-In Observability

Every instance deployed through Simple Stack automatically gets:

- **Prometheus** – Scrapes metrics from all services, infrastructure, and exporters
- **Loki** – Aggregates logs from Docker containers and system services
- **Grafana** – Pre-configured dashboards for infrastructure, platform, and application metrics
- **Alerting** – Out-of-the-box rules for common operational concerns

---

## Philosophy

- **Simplicity First** – Each component is understandable and maintainable
- **Transparency** – All configuration is version-controlled and auditable
- **Portability** – Works on any cloud or on-premise hardware
- **Extensibility** – Add new services without rewriting core systems

---

## Contributing

Contributions are welcome! Please:

- Fork the repository
- Create a feature branch
- Add tests and documentation for new features
- Open a Pull Request with a clear description

For detailed guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## Get Support

- 📖 **Documentation** – https://your-domain.com/docs
- 💬 **Discussions** – GitHub Discussions (coming soon)
- 🐛 **Issues** – Report bugs on GitHub Issues


## Acknowledgements

Thanks to the open‑source community for the tools that make this stack possible: Terraform, Ansible, Docker and the many contributors of the underlying roles.
