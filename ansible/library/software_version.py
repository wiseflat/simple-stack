#!/usr/bin/python
# Copyright: (c) 2024, Mathieu Garcia
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

from ansible.module_utils.basic import AnsibleModule
import json
import os

def software_version(software, version, file_path):
    result = {
        "changed": False,
        "original_content": {},
        "updated_content": {}
    }

    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                return {"failed": True, "msg": "Corrupted JSON file"}
    else:
        data = {}

    result["original_content"] = data.copy()

    if software not in data or data[software] != version:
        data[software] = version
        result["changed"] = True

    result["updated_content"] = data

    if result["changed"]:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)

    return result

def main():
    module_args = {
        "software": {"type": "str", "required": True},
        "version": {"type": "str", "required": True},
        "file_path": {"type": "str", "required": True}
    }

    module = AnsibleModule(argument_spec=module_args, supports_check_mode=True)

    software = module.params["software"]
    version = module.params["version"]
    file_path = module.params["file_path"]

    result = software_version(software, version, file_path)

    if module.check_mode:
        result["changed"] = False

    if "failed" in result:
        module.fail_json(**result)
    else:
        module.exit_json(**result)

if __name__ == "__main__":
    main()
