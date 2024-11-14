#!/usr/bin/python

# Copyright: (c) 2024, Michał Wojciechowski <mic.wojciechowski@gmail.com>
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
from __future__ import (absolute_import, division, print_function)
from ansible.module_utils.basic import AnsibleModule, missing_required_lib
from ansible.module_utils.keepass_func import check_pykeepass_present, check_variables, open_database, attempt_lock, get_entry, remove_entry
import datetime

pykeepass_present, LIB_IMPORT_ERR = check_pykeepass_present()

__metaclass__ = type

DOCUMENTATION = r'''
---
module: keepass_remove_entry

short_description: This module removes entry in KeePass database.

# If this is part of a collection, you need to use semantic versioning,
# i.e. the version is of the form "2.5.0" and not "2.4".
version_added: "1.0.0"

description: This module removes entry in KeePass database.

options:
    database:
        description:
            - "Path to KeePass database. Alternative name: path."
        required: true
        type: str
    password:
        description:
            - "Password of KeePass database. Required if keyfile is not defined."
        required: false
        type: str
    keyfile:
        description:
            - "Path to the KeePass keyfile. Must already exist. Required if password is not defined."
        required: false
        type: str
    timeout:
        description:
            - "Time before aquiring lock to database file fails (in seconds)."
        required: false
        default: 60
        type: int
    entry:
        description:
            - "Title of entry to be removed."
        required: true
        type: str
    group:
        description:
            - "Path to the group where entry is present. Each group must by separated by '/'. Example: test-group/subgroup/subsubgroup."
        required: false
        default: root group
        type: str

author:
    - Michał Wojciechowski (@Michercik)
'''

EXAMPLES = r'''
- name: Remove entry from root group
  keepass_remove_entry:
    database: "/tmp/database.kdbx"
    password: "test-password"
    entry: "test"

- name: Remove entry from group
  keepass_remove_entry:
    database: "/tmp/database.kdbx"
    keyfile: "/tmp/keyfile.key"
    timeout: 180
    entry: "test"
    group: "test-group"
'''

RETURN = r'''
# These are examples of possible return values, and in general should use other names for return values.
database:
    description: Path to the KeePass database.
    type: str
entry:
    description: Title of the removed entry.
    type: str
group:
    description: Path to the group where entry was present.
    type: str
msg:
    description: The output message that the module generates.
    type: str
'''

def run_module():
    # define available arguments/parameters a user can pass to the module
    module_args = dict(
        database=dict(type='str', required=False),
        path=dict(type='str', required=False),
        password=dict(type='str', no_log=True),
        keyfile=dict(type='str', no_log=True),
        timeout=dict(type='int', default=60),
        entry=dict(type='str', required=True),
        group=dict(type='str', required=False)
        )


    # seed the result dict in the object
    # we primarily care about changed and state
    # changed is if this module effectively modified the target
    # state will include any data that you want your module to pass back
    # for consumption, for example, in a subsequent task
    result = dict(
        changed=False,
        database='',
        entry='',
        group='',
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

    if not pykeepass_present:
        module.fail_json(msg=missing_required_lib("pykeepass"), exception=LIB_IMPORT_ERR)

    database            = module.params['database']
    path                = module.params['path']
    password            = module.params['password']
    keyfile             = module.params['keyfile']
    timeout             = module.params['timeout']
    entry               = module.params['entry']
    group               = module.params['group']

    check_variables(module, database, path, 'database', 'path')
    check_variables(module, password, keyfile, 'password', 'keyfile')

    database = database if database else path

    with attempt_lock(module, database, timeout):

        kp = open_database(module, database, password, keyfile)

        if module.check_mode:
            if not get_entry(kp, entry, group, False):
                module.exit_json(changed=False, msg=f"No entry '{entry}' in group '{group}'.")

        if not module.check_mode:
            try:
                removal = remove_entry(kp, entry, group)
                if not removal:
                    module.exit_json(changed=False, msg=f"No entry '{entry}' in group '{group}'.")
            except Exception as e:
                module.fail_json(msg=f"An unexpected error occurred: {str(e)}")

        result['changed'] = True
        result['database'] = database
        result['entry'] = entry
        result['group'] = group
        result['msg'] = "Entry successfuly removed."

        # in the event of a successful module execution, you will want to
        # simple AnsibleModule.exit_json(), passing the key/value results
        module.exit_json(**result)


def main():
    run_module()


if __name__ == '__main__':
    main()
