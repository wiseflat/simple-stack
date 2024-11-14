#!/usr/bin/python

# Copyright: (c) 2024, Michał Wojciechowski <mic.wojciechowski@gmail.com>
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
from __future__ import (absolute_import, division, print_function)
from ansible.module_utils.basic import AnsibleModule, missing_required_lib
from ansible.module_utils.keepass_func import check_pykeepass_present, check_variables, open_database, get_entry


pykeepass_present, LIB_IMPORT_ERR = check_pykeepass_present()

__metaclass__ = type

DOCUMENTATION = r'''
---
module: keepass_get_entry

short_description: This module gets entry from a KeePass database.

# If this is part of a collection, you need to use semantic versioning,
# i.e. the version is of the form "2.5.0" and not "2.4".
version_added: "1.0.0"

description: This module gets entry from a KeePass database.

options:
    name:
        description:
            - "Title of the entry in KeePass database. Alternative name: title."
        required: true
        type: str
    group:
        description:
            - "Path to the group where entry must be added. Each group must by separated by '/'. If not defined, it will return first match. Example: test-group/subgroup/subsubgroup."
        required: false
        type: str
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

author:
    - Michał Wojciechowski (@Michercik)
'''

EXAMPLES = r'''
- name: Get entry
  keepass_get_entry:
    name: "test-entry"
    database: "/tmp/database.kdbx"
    password: "test-password"

- name: Get entry in group 'test-group
  keepass_get_entry:
    name: "test-entry"
    group: "test-group"
    path: "/tmp/database.kdbx"
    password: "test-password"
'''

RETURN = r'''
# These are examples of possible return values, and in general should use other names for return values.
database:
    description: Path to the KeePass database.
    type: str
entry:
    description: Details of entry in KeePass database.
    type: str
'''

def run_module():
    # define available arguments/parameters a user can pass to the module
    module_args = dict(
        name=dict(type='str', required=False),
        title=dict(type='str', required=False),
        group=dict(type='str', required=False),
        database=dict(type='str', required=False),
        path=dict(type='str', required=False),
        passwd=dict(type='str', no_log=False),
        keyfile=dict(type='str', no_log=True)
    )


    # seed the result dict in the object
    # we primarily care about changed and state
    # changed is if this module effectively modified the target
    # state will include any data that you want your module to pass back
    # for consumption, for example, in a subsequent task
    result = dict(
        changed=False,
        database='',
        entry=''
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

    name                = module.params['name']
    title               = module.params['title']
    group               = module.params['group']
    database            = module.params['database']
    path                = module.params['path']
    password            = module.params['passwd']
    keyfile             = module.params['keyfile']

    check_variables(module, database, path, 'database', 'path')
    check_variables(module, password, keyfile, 'password', 'keyfile')
    check_variables(module, name, title, 'name', 'title')

    database = database if database else path
    name = name if name else title

    kp = open_database(module, database, password, keyfile)

    database_entry = get_entry(kp, name, group, True)
    if database_entry is None:
        module.fail_json(msg=f"No entry named {name} found.")

    entry = {}
    (
        entry['title'],
        entry['group'],
        entry['username'],
        entry['password'],
        entry['url'],
        entry['expires'],
        entry['expiry_time'],
        entry['notes'],
        entry['tags']
    ) = database_entry

    entry['group_path'] = None
    group_paths = kp.find_groups(name=entry['group'], regex=True)
    if group_paths:
        for group_path in group_paths:
            if group_path.name == entry['group']:
                entry['group_path'] = '/'.join(group_path.path)


    result['database'] = database
    result['entry'] = entry

    # in the event of a successful module execution, you will want to
    # simple AnsibleModule.exit_json(), passing the key/value results
    module.exit_json(**result)


def main():
    run_module()


if __name__ == '__main__':
    main()
