#!/usr/bin/python
# Copyright: (c) 2024, Mathieu Garcia
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

from ansible.module_utils.basic import AnsibleModule
from passlib.hash import bcrypt


def main():
    module_args = dict(
        proto=dict(type='str', choices=['tcp', 'http'], required=True),
        domain=dict(type='str', required=True),
        domain_alias=dict(type='str', required=False, default=None),
        basic_auth=dict(type='bool', required=False, default=False),
        ipfilter=dict(type='list', elements='str', required=False, default=[])
    )

    result = dict(
        changed=False,
        labels={}
    )

    module = AnsibleModule(
        argument_spec=module_args,
        supports_check_mode=True
    )

    # Retrieve parameters
    proto = module.params['proto']
    domain = module.params['domain']
    domain_alias = module.params['domain_alias']
    basic_auth = module.params['basic_auth']
    ipfilter = module.params['ipfilter']

    service_name = domain.replace('.', '').replace('-', '')

    # Base labels
    labels = {
        "traefik.enable": "true",
        f"traefik.{proto}.routers.{service_name}.tls": "true",
        f"traefik.{proto}.routers.{service_name}.tls.certresolver": "myresolver",
        f"traefik.{proto}.routers.{service_name}.tls.options": "mintls12@file",
        f"traefik.{proto}.routers.{service_name}.entrypoints": "https",
        f"traefik.{proto}.routers.{service_name}.rule": f"Host(`{domain}`)",
    }

    # Domain alias
    if domain_alias:
        labels[f"traefik.{proto}.routers.{service_name}.rule"] += f" || Host(`{domain_alias}`)"

    # HTTP-specific middleware
    if proto == 'http':
        labels.update({
            f"traefik.http.middlewares.{service_name}-headers.headers.accessControlMaxAge": "15552000",
            f"traefik.http.middlewares.{service_name}-headers.headers.browserXssFilter": "true",
            f"traefik.http.middlewares.{service_name}-headers.headers.contentTypeNosniff": "true",
            f"traefik.http.middlewares.{service_name}-headers.headers.customFrameOptionsValue": "SAMEORIGIN",
            f"traefik.http.middlewares.{service_name}-headers.headers.customResponseHeaders.Strict-Transport-Security": "max-age=63072000",
            f"traefik.http.middlewares.{service_name}-headers.headers.forceSTSHeader": "true",
            f"traefik.http.middlewares.{service_name}-headers.headers.frameDeny": "true",
            f"traefik.http.middlewares.{service_name}-headers.headers.stsIncludeSubdomains": "true",
            f"traefik.http.middlewares.{service_name}-headers.headers.stsPreload": "true",
            f"traefik.http.middlewares.{service_name}-headers.headers.stsSeconds": "31536000",
            f"traefik.http.middlewares.{service_name}.redirectscheme.scheme": "https",
            f"traefik.http.middlewares.{service_name}.redirectscheme.permanent": "true",
        })

    # Combine middlewares based on conditions
    middlewares = []

    # Basic auth
    if basic_auth:
        # Generate basic_auth string from environment variables
        project_admin_login = module.run_command("printenv PROJECT_ADMIN_LOGIN")[1].strip()
        project_admin_password = module.run_command("printenv PROJECT_ADMIN_PASSWORD")[1].strip()
        if not project_admin_login or not project_admin_password:
            module.fail_json(msg="Environment variables PROJECT_ADMIN_LOGIN or PROJECT_ADMIN_PASSWORD are not set")

        hashed_password = bcrypt.hash(project_admin_password)
        auth_string = f"{project_admin_login}:{hashed_password}"

        labels[f"traefik.http.middlewares.{service_name}-basicauth.basicauth.users"] = auth_string
        middlewares.append(f"{service_name}-basicauth@docker")

    # IP Filtering
    if ipfilter:
        labels[f"traefik.http.middlewares.{service_name}-whistelist.IPAllowList.sourcerange"] = ",".join(ipfilter)
        middlewares.append(f"{service_name}-whistelist@docker")

    # Add middlewares to the router if any exist
    if middlewares:
        labels[f"traefik.http.routers.{service_name}.middlewares"] = ",".join(middlewares)

    # Return the labels
    result['labels'] = labels

    module.exit_json(**result)


if __name__ == '__main__':
    main()
