#!/usr/bin/python

from ansible.module_utils.basic import AnsibleModule
import subprocess
import json

def main():
    module_args = dict(
        service=dict(type='str', required=True)
    )

    module = AnsibleModule(
        argument_spec=module_args,
        supports_check_mode=True
    )

    service = module.params['service']
    try:
        result = subprocess.check_output(['dig', '@127.0.0.1', '-p', '1053', '+short', 'SRV', service], text=True)
        records = []
        for line in result.splitlines():
            parts = line.split()
            if len(parts) == 4:
                records.append({
                    'name': service,
                    'ip': parts[3],
                    'port': int(parts[2])
                })
        module.exit_json(changed=False, records=records)
    except subprocess.CalledProcessError as e:
        module.fail_json(msg=str(e))

if __name__ == '__main__':
    main()
