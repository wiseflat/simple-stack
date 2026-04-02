#!/usr/bin/env python3

import json
import requests
import os
import logging
import sys
import time

# Configure logging
logging.basicConfig(level=logging.INFO)

REQUIRED_ENV_VARS = [
    "SIMPLE_STACK_UI_URL",
    "SIMPLE_STACK_UI_USER",
    "SIMPLE_STACK_UI_PASSWORD",
]


def get_required_env():
    missing = [var for var in REQUIRED_ENV_VARS if not os.environ.get(var)]
    if missing:
        logging.error("Missing required environment variables: %s", ", ".join(missing))
        return None

    return {
        "url": os.environ["SIMPLE_STACK_UI_URL"],
        "user": os.environ["SIMPLE_STACK_UI_USER"],
        "password": os.environ["SIMPLE_STACK_UI_PASSWORD"],
    }

def fetch_inventory():
    """
    Fetches inventory data from the SIMPLE STACK UI API.

    Returns:
        dict or None: The inventory data as a dictionary if successful, None otherwise.
    """
    env = get_required_env()
    if env is None:
        return None

    session = requests.Session()
    session.auth = (env["user"], env["password"])
    retries = int(os.environ.get("SIMPLE_STACK_UI_RETRIES", "3"))
    timeout = float(os.environ.get("SIMPLE_STACK_UI_TIMEOUT", "10"))

    try:
        url = f"{env['url']}/api/inventory"
        logging.debug("Fetching inventory from %s", url)

        for attempt in range(1, retries + 1):
            try:
                response = session.get(url, timeout=timeout)
                response.raise_for_status()
                return response.json()
            except requests.exceptions.HTTPError as e:
                status = getattr(e.response, "status_code", 0)
                is_retryable = 500 <= status < 600
                if is_retryable and attempt < retries:
                    logging.warning("HTTP %s while fetching inventory (attempt %s/%s)", status, attempt, retries)
                    time.sleep(attempt)
                    continue
                logging.error("HTTP error occurred: %s", e)
                break
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                if attempt < retries:
                    logging.warning("Connection error while fetching inventory (attempt %s/%s): %s", attempt, retries, e)
                    time.sleep(attempt)
                    continue
                logging.error("Connection error occurred: %s", e)
            except requests.exceptions.RequestException as e:
                logging.error("An error occurred: %s", e)
                break
    finally:
        session.close()  # Ensure the session is closed

    return None

# Fetch and print inventory data
inventory = fetch_inventory()
if inventory:
    print(json.dumps(inventory, indent=2))
else:
    logging.error("Failed to retrieve inventory data.")
    sys.exit(1)
