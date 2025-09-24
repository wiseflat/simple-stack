from __future__ import (absolute_import, annotations, division, print_function)
__metaclass__ = type

import base64
import os
import string
import random

from urllib.error import HTTPError, URLError
import urllib.parse

from ansible.errors import AnsibleError, AnsibleParserError
from ansible.module_utils.common.text.converters import to_text, to_native
from ansible.module_utils.urls import open_url, ConnectionError, SSLValidationError
from ansible.plugins.lookup import LookupBase
from ansible.utils.display import Display

display = Display()


class LookupModule(LookupBase):

    def run(self, terms, variables=None, **kwargs):

        self.set_options(var_options=variables, direct=kwargs)

        ret = []
        api_url = (
            os.environ.get("SIMPLE_STACK_UI_URL")
            or variables.get("mylookup_api_url")
            or "http://127.0.0.1:8000"
        )

        username = (
            os.environ.get("SIMPLE_STACK_UI_USER")
            or variables.get("mylookup_user")
        )
        password = (
            os.environ.get("SIMPLE_STACK_UI_PASSWORD")
            or variables.get("mylookup_password")
        )

        token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("utf-8")
        headers = {}
        headers["Authorization"] = f"Bearer {token}"

        display.vvvv(f"mylookup2: Authorization headers {headers}")

        custom_keys = [
            "type", "key", "subkey", "delete",
            "missing", "nosymbols", "overwrite", "userpass", "length"
        ]

        data = {}
        for k in custom_keys:
            if k in kwargs:
                data[k] = kwargs.pop(k)

        if "nosymbols" not in data:
            data["nosymbols"] = False

        if "overwrite" not in data:
            data["overwrite"] = False

        if "delete" not in data:
            data["delete"] = False

        if data['missing'] not in ['error', 'warn', 'create']:
            raise AnsibleError(f"{data['missing']} is not a valid option for missing")

        split_lines = kwargs.pop("split_lines", False)

        try:
            data_bytes = urllib.parse.urlencode(data).encode("utf-8")
        except Exception as exc:
            raise AnsibleError(f"mylookup2: error encoding POST data: {to_native(exc)}")

        display.vvvv(f"mylookup2: POSTing to {api_url} with data={data}")


        try:
            response = open_url(
                f"{api_url}/api/secret",
                headers=headers,
                data=data_bytes,
                method="POST",
                **kwargs,
            )
        except HTTPError as e:
            status = e.code
            body = e.read().decode(errors='replace')

            if status == 460:
                display.warning((f"{data["key"]}/{data["subkey"]} does not exist... Continue anyway"))
                return [{}]

            if status == 461:
                raise AnsibleError(f"{data["key"]}/{data["subkey"]} does not exist")

            raise AnsibleError(f"HTTP {status} for {api_url}: {body}")

        raw = response.read()
        text = to_text(raw).strip('"\'')

        if split_lines:
            return text.splitlines()
        else:
            return [text]
