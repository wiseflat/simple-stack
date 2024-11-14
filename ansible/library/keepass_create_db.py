#!/usr/bin/python

# Copyright: (c) 2024, Michał Wojciechowski <mic.wojciechowski@gmail.com>
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)
from __future__ import (absolute_import, division, print_function)
from ansible.module_utils.basic import AnsibleModule, missing_required_lib
from ansible.module_utils.keepass_func import check_pykeepass_present, check_variables, check_database_exists
import traceback


pykeepass_present, LIB_IMPORT_ERR = check_pykeepass_present()
try:
    from pykeepass import create_database
except ImportError:
    LIB_IMPORT_ERR = traceback.format_exc()
    pykeepass_present = False

__metaclass__ = type

DOCUMENTATION = r'''
---
module: keepass_create_db

short_description: This module creates KeePass database.

# If this is part of a collection, you need to use semantic versioning,
# i.e. the version is of the form "2.5.0" and not "2.4".
version_added: "1.0.0"

description: This module creates KeePass database.

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

author:
    - Michał Wojciechowski (@Michercik)
'''

EXAMPLES = r'''
- name: Create database with password
  keepass_create_db:
    database: "/tmp/database.kdbx"
    password: "test-password"

- name: Create database with keyfile
  keepass_create_db:
    path: "/tmp/database.kdbx"
    keyfile: "/tmp/keyfile.key"
'''

RETURN = r'''
# These are examples of possible return values, and in general should use other names for return values.
database:
    description: Path to the KeePass database.
    type: str
msg:
    description: The output message that the module generates.
    type: str
'''

def run_module():
    # define available arguments/parameters a user can pass to the module
    module_args = dict(
        path=dict(type='str', required=False),
        database=dict(type='str', required=False),
        password=dict(type='str', no_log=True),
        keyfile=dict(type='str', no_log=True)
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

    if not pykeepass_present:
        module.fail_json(msg=missing_required_lib("pykeepass"), exception=LIB_IMPORT_ERR)

    path                = module.params['path']
    database            = module.params['database']
    password            = module.params['password']
    keyfile             = module.params['keyfile']

    check_variables(module, database, path, 'database', 'path')
    check_variables(module, password, keyfile, 'password', 'keyfile')

    database = database if database else path

    if check_database_exists(module, database, password, keyfile):
        module.exit_json(changed=False, msg="Database already exists.")

    if not module.check_mode:
        try:
            create_database(database, password=password, keyfile=keyfile, transformed_key=None)
        except FileNotFoundError:
            if check_database_exists(module, database, password, keyfile):
                module.exit_json(changed=False, msg="Database already exists.")
        except Exception as e:
            module.fail_json(msg=f"An unexpected error occurred: {str(e)}")

    result['changed'] = True
    result['database'] = database
    result['msg'] = "Database successfully created."

    # in the event of a successful module execution, you will want to
    # simple AnsibleModule.exit_json(), passing the key/value results
    module.exit_json(**result)


def main():
    run_module()


if __name__ == '__main__':
    main()
