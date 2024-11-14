#!/usr/bin/python

# Copyright: (c) 2024, Michał Wojciechowski <mic.wojciechowski@gmail.com>
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
from __future__ import (absolute_import, division, print_function)
from ansible.module_utils.basic import AnsibleModule, missing_required_lib
from ansible.module_utils.keepass_func import generate_keyfile
import os

__metaclass__ = type

DOCUMENTATION = r'''
---
module: keepass_create_keyfile

short_description: This module creates a KeePass keyfile.

# If this is part of a collection, you need to use semantic versioning,
# i.e. the version is of the form "2.5.0" and not "2.4".
version_added: "1.0.0"

description: This module creates a KeePass keyfile.

options:
    path:
        description:
            - "Path to keyfile."
        required: true
        type: str

author:
    - Michał Wojciechowski (@Michercik)
'''

EXAMPLES = r'''
- name: Create keyfile
  keepass_create_keyfile:
    path: "/tmp/keyfile.keyx"
'''

RETURN = r'''
# These are examples of possible return values, and in general should use other names for return values.
path:
    description: Path to the KeePass keyfile.
    type: str
msg:
    description: The output message that the module generates.
    type: str
'''

def run_module():
    # define available arguments/parameters a user can pass to the module
    module_args = dict(
        path=dict(type='str', required=True)
    )

    # seed the result dict in the object
    # we primarily care about changed and state
    # changed is if this module effectively modified the target
    # state will include any data that you want your module to pass back
    # for consumption, for example, in a subsequent task
    result = dict(
        changed=False,
        path='',
        msg=''
    )

    # the AnsibleModule object will be our abstraction working with Ansible
    # this includes instantiation, a couple of common attr would be the
    # args/params passed to the execution, as well as if the module
    # supports check mode
    module = AnsibleModule(
        argument_spec=module_args,
        supports_check_mode=True
    )

    path = module.params['path']

    if os.path.exists(path):
        module.exit_json(changed=False, msg=f"File in '{path}' already exists.")

    if not module.check_mode:
        try:
            generate_keyfile(path)
        except Exception as e:
            module.fail_json(msg=f"An unexpected error occurred: {str(e)}")

    result['changed'] = True
    result['path'] = path
    result['msg'] = "Keyfile successfully created."

    # in the event of a successful module execution, you will want to
    # simple AnsibleModule.exit_json(), passing the key/value results
    module.exit_json(**result)


def main():
    run_module()

if __name__ == '__main__':
    main()
