# callback_plugins/http_callback.py

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import os
import json
import uuid
import requests

from ansible.plugins.callback import CallbackBase
from ansible.utils.display import Display

display = Display()

DOCUMENTATION = '''
    callback: http_callback
    type: notification
    short_description: Envoie les événements Ansible vers un endpoint HTTP avec token
    version_added: "2.0"
    description:
        - Ce plugin envoie les logs d'exécution Ansible vers une API HTTP distante, avec authentification Bearer facultative.
    options:
        http_endpoint:
            description: URL de destination
            env:
                - name: HTTP_CALLBACK_ENDPOINT
            ini:
                - section: callback_http
                  key: endpoint
            required: true
        http_token:
            description: Token d'authentification Bearer
            env:
                - name: HTTP_CALLBACK_TOKEN
            ini:
                - section: callback_http
                  key: token
            required: false
'''

class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'http_callback'

    def __init__(self):
        super(CallbackModule, self).__init__()
        self.endpoint = None
        self.token = None
        self.id = str(uuid.uuid4())
        self.playbook_name = "unknown"

    def set_options(self, task_keys=None, var_options=None, direct=None):
        super().set_options(task_keys=task_keys, var_options=var_options, direct=direct)
        self.endpoint = self.get_option("http_endpoint")
        self.token = self.get_option("http_token")

    def _post(self, payload):
        if not self.endpoint:
            #display.warning("HTTP Callback : endpoint non défini, rien ne sera envoyé.")
            return

        payload["id"] = self.id
        payload["playbook_name"] = self.playbook_name

        try:
            headers = {"Content-Type": "application/json"}
            if self.token:
                headers["x-token"] = self.token

            response = requests.post(
                self.endpoint,
                data=json.dumps(payload),
                headers=headers,
                timeout=5
            )
            response.raise_for_status()
        except Exception as e:
            display.warning(f"[http_callback] Erreur HTTP : {e}")

    def v2_playbook_on_start(self, playbook):
        self.playbook_name = playbook._file_name if hasattr(playbook, "_file_name") else "unknown"
        self._post({
            "event": "playbook_start"
        })

    def v2_runner_on_ok(self, result):
        self._post({
            "event": "ok",
            "host": result._host.get_name(),
            "task": result.task_name,
            "result": result._result
        })

    def v2_runner_on_failed(self, result, ignore_errors=False):
        self._post({
            "event": "failed",
            "host": result._host.get_name(),
            "task": result.task_name,
            "result": result._result,
            "ignore_errors": ignore_errors
        })

    def v2_runner_on_skipped(self, result):
        self._post({
            "event": "skipped",
            "host": result._host.get_name(),
            "task": result.task_name
        })

    def v2_runner_on_unreachable(self, result):
        self._post({
            "event": "unreachable",
            "host": result._host.get_name(),
            "task": result.task_name,
            "result": result._result
        })

    def v2_playbook_on_stats(self, stats):
        summary = {
            host: stats.summarize(host)
            for host in stats.processed
        }
        self._post({
            "event": "summary",
            "summary": summary
        })
