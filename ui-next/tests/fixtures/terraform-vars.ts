// Canonical tfstate payload for integration tests.
// Stored as YAML for readability, converted to JSON before API submission.
export const tfstatePayloadYaml = `check_results: null
lineage: ""
outputs: {}
resources:
  - instances:
      - attributes:
          groups: []
          id: instance001.frontends.region.provider.test
          name: instance001.frontends.region.provider.test
          variables:
            ansible_host: 1.2.3.4
            ansible_ssh_common_args: -oConnectTimeout=20
            ansible_ssh_private_key_file: ~/.ssh/id_ed25519_simplestack
            ansible_user: ubuntu
            fqdn: instance001.frontends.region.provider.test
            hostname: instance001.frontends.region.provider.test
        index_key: instance001.frontends.region.provider.test
        private: bnVsbA==
        schema_version: 0
        sensitive_attributes: []
    mode: managed
    name: host
    provider: provider["registry.terraform.io/ansible/ansible"]
    type: ansible_host
serial: 9
terraform_version: 1.5.7
version: 4
`;
