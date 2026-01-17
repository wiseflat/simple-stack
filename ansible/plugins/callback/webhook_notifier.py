# -*- coding: utf-8 -*-
from __future__ import (absolute_import, annotations, division, print_function)
__metaclass__ = type

DOCUMENTATION = '''
name: webhook_notifier
type: notification
short_description: Envoie des notifications webhook au démarrage et à la fin des playbooks
description:
    - Ce plugin de callback envoie des requêtes HTTP POST à un webhook configuré
    - Il notifie au démarrage du playbook, en cas de succès et en cas d'échec
    - Utilise l'API Simple Stack UI pour envoyer les notifications
options:
    webhook_enabled:
        description: Active ou désactive les notifications
        env:
            - name: ANSIBLE_WEBHOOK_ENABLED
        ini:
            - section: webhook_notifier
              key: enabled
        default: true
        type: bool
'''

import base64
import json
import os
import socket
import datetime
import subprocess

from ansible.plugins.callback import CallbackBase
from ansible.utils.display import Display

display = Display()


class CallbackModule(CallbackBase):
    """
    Plugin de callback pour envoyer des notifications webhook
    lors des différentes étapes d'exécution d'un playbook Ansible.
    
    Configuration via variables d'environnement ou variables Ansible:
        - SIMPLE_STACK_UI_URL / webhook_api_url
        - SIMPLE_STACK_UI_USER / webhook_user
        - SIMPLE_STACK_UI_PASSWORD / webhook_password
    """

    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'notification'
    CALLBACK_NAME = 'webhook_notifier'
    CALLBACK_NEEDS_WHITELIST = True

    def __init__(self):
        super(CallbackModule, self).__init__()
        self.playbook_name = None
        self.playbook_path = None
        self.start_time = None
        self.hosts = []
        self.disabled = False
        self.play_vars = {}

    def set_options(self, task_keys=None, var_options=None, direct=None):
        super(CallbackModule, self).set_options(task_keys=task_keys, var_options=var_options, direct=direct)

        self.webhook_enabled = self.get_option('webhook_enabled')

        if not self.webhook_enabled:
            display.vvv("webhook_notifier: Plugin désactivé via configuration")
            self.disabled = True

    def _get_connection_config(self, variables: dict = None):
        """
        Récupère les informations de connexion à l'API.
        Priorité: variables d'environnement > variables Ansible > valeur par défaut
        """
        variables = variables or self.play_vars or {}

        api_url = (
            os.environ.get("SIMPLE_STACK_UI_URL")
            or variables.get("webhook_api_url")
            or "http://127.0.0.1:8000"
        )

        username = (
            os.environ.get("SIMPLE_STACK_UI_USER")
            or variables.get("webhook_user")
        )

        password = (
            os.environ.get("SIMPLE_STACK_UI_PASSWORD")
            or variables.get("webhook_password")
        )

        return api_url, username, password

    def _send_webhook(self, event_type: str, status: str, message: str, extra_data: dict = None):
        """
        Envoie une notification au webhook configuré via curl (subprocess).
        Utilise curl pour éviter les problèmes de fork sur macOS.
        """
        if self.disabled:
            return

        try:
            api_url, username, password = self._get_connection_config()

            if not api_url:
                display.warning("webhook_notifier: URL de l'API non configurée, notification ignorée")
                return

            payload = {
                "schema": "events_create",
                "data": {
                    "event_type": event_type,
                    "status": status,
                    "message": message,
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                    "playbook": {
                        "name": self.playbook_name or "unknown",
                        "path": self.playbook_path or "unknown",
                    },
                    "execution": {
                        "hostname": socket.gethostname(),
                        "user": os.environ.get("USER", "unknown"),
                    }
                }
            }
            
            if self.start_time:
                payload["data"]["execution"]["start_time"] = self.start_time.isoformat() + "Z"
                payload["data"]["duration_seconds"] = (
                    datetime.datetime.utcnow() - self.start_time
                ).total_seconds()

            if self.hosts:
                payload["data"]["hosts"] = [str(h) for h in self.hosts]

            if extra_data:
                payload["data"].update(extra_data)

            webhook_endpoint = f"{api_url}/api"
            json_payload = json.dumps(payload)

            display.vvv(f"webhook_notifier: Envoi vers {webhook_endpoint}")
            display.vvvv(f"webhook_notifier: Payload: {json.dumps(payload, indent=2)}")

            # Construire la commande curl
            curl_cmd = [
                "curl", "-s", "-S",
                "-X", "POST",
                "-H", "Content-Type: application/json",
                "-H", "User-Agent: Ansible-Webhook-Notifier/1.0",
                "--connect-timeout", "5",
                "--max-time", "10",
                "-d", json_payload,
            ]

            # Ajouter l'authentification si configurée
            if username and password:
                token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("utf-8")
                curl_cmd.extend(["-H", f"Authorization: Bearer {token}"])

            curl_cmd.append(webhook_endpoint)

            # Exécuter curl en arrière-plan (non-bloquant)
            # start_new_session=True détache le processus du groupe de processus parent
            subprocess.Popen(
                curl_cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True
            )

            display.vvv(f"webhook_notifier: Requête envoyée")

        except Exception as e:
            display.warning(f"webhook_notifier: Erreur lors de l'envoi du webhook: {str(e)}")

    # -------------------------------------------------------------------------
    # Callback: Démarrage du playbook
    # -------------------------------------------------------------------------
    def v2_playbook_on_start(self, playbook):
        """Appelée au démarrage du playbook."""
        try:
            self.playbook_path = str(playbook._file_name) if playbook._file_name else "unknown"
            self.playbook_name = os.path.basename(self.playbook_path)
            self.start_time = datetime.datetime.utcnow()

            display.vvv(f"webhook_notifier: Playbook démarré - {self.playbook_name}")

            self._send_webhook(
                event_type="playbook_start",
                status="started",
                message=f"Playbook '{self.playbook_name}' démarré"
            )
        except Exception as e:
            display.warning(f"webhook_notifier: Erreur dans v2_playbook_on_start: {str(e)}")

    # -------------------------------------------------------------------------
    # Callback: Statistiques finales (succès ou échec)
    # -------------------------------------------------------------------------
    def v2_playbook_on_stats(self, stats):
        """
        Appelée à la fin du playbook avec les statistiques d'exécution.
        Permet de déterminer si le playbook a réussi ou échoué.
        """
        try:
            hosts_stats = {}
            total_failures = 0
            total_unreachable = 0
            total_ok = 0
            total_changed = 0
            total_skipped = 0

            for host in stats.processed.keys():
                summary = stats.summarize(host)
                hosts_stats[str(host)] = dict(summary)
                total_failures += summary.get('failures', 0)
                total_unreachable += summary.get('unreachable', 0)
                total_ok += summary.get('ok', 0)
                total_changed += summary.get('changed', 0)
                total_skipped += summary.get('skipped', 0)

            has_failures = total_failures > 0 or total_unreachable > 0

            stats_summary = {
                "stats": {
                    "total_hosts": len(stats.processed),
                    "ok": total_ok,
                    "changed": total_changed,
                    "failures": total_failures,
                    "unreachable": total_unreachable,
                    "skipped": total_skipped,
                },
                "hosts_details": hosts_stats
            }

            if has_failures:
                failed_hosts = [
                    str(host) for host, summary in hosts_stats.items()
                    if summary.get('failures', 0) > 0 or summary.get('unreachable', 0) > 0
                ]

                display.vvv(f"webhook_notifier: Playbook échoué - {self.playbook_name}")

                self._send_webhook(
                    event_type="playbook_failure",
                    status="failure",
                    message=f"Playbook '{self.playbook_name}' échoué sur {len(failed_hosts)} hôte(s): {', '.join(failed_hosts)}",
                    extra_data=stats_summary
                )
            else:
                display.vvv(f"webhook_notifier: Playbook réussi - {self.playbook_name}")

                self._send_webhook(
                    event_type="playbook_success",
                    status="success",
                    message=f"Playbook '{self.playbook_name}' terminé avec succès sur {len(stats.processed)} hôte(s)",
                    extra_data=stats_summary
                )
        except Exception as e:
            display.warning(f"webhook_notifier: Erreur dans v2_playbook_on_stats: {str(e)}")

    # -------------------------------------------------------------------------
    # Callbacks optionnelles pour collecter plus d'informations
    # -------------------------------------------------------------------------
    def v2_playbook_on_play_start(self, play):
        """Appelée au démarrage de chaque play - collecte les hôtes ciblés et les variables."""
        try:
            variable_manager = play.get_variable_manager()
            raw_vars = variable_manager.get_vars() or {}
            
            self.play_vars = {}
            for key in ['webhook_api_url', 'webhook_user', 'webhook_password']:
                if key in raw_vars:
                    self.play_vars[key] = str(raw_vars[key])

            extra_vars = variable_manager.extra_vars or {}
            for key in ['webhook_api_url', 'webhook_user', 'webhook_password']:
                if key in extra_vars:
                    self.play_vars[key] = str(extra_vars[key])

            display.vvvv(f"webhook_notifier: Variables récupérées: {list(self.play_vars.keys())}")

            hosts = raw_vars.get('ansible_play_hosts_all', [])
            if hosts:
                self.hosts = [str(h) for h in hosts]
            else:
                self.hosts = [str(play.hosts)]
                
        except Exception as e:
            display.vvvv(f"webhook_notifier: Impossible de récupérer les variables: {e}")
            self.play_vars = {}
            try:
                self.hosts = [str(play.hosts)]
            except Exception:
                self.hosts = []
