#!/usr/bin/env python3

# from ansible.constants import DEFAULT_VAULT_ID_MATCH
# from ansible.parsing.vault import VaultLib, VaultSecret

import json
import requests

inventory = {"_meta": {"hostvars": {}}}

# if "TOKEN" not in os.environ:
#     raise ValueError("Environment variable TOKEN does not exist")

# Add documentation for this function
'''
Make query to get project inventory
'''
# headers = {"x-token": os.environ["TOKEN"]}
headers = {}
r = requests.get(
    # "https://manager.qws.io/api/", headers=headers, json=data
    "http://localhost:8000/api/inventory", headers=headers
)
print(r.text)
# result = json.loads(r.text)

# print(json.dumps(json.loads(result), indent=2))
