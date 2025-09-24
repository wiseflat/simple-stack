#!/usr/bin/env python3

import json
import requests
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

def fetch_inventory():
    """
    Fetches inventory data from the SIMPLE STACK UI API.

    Returns:
        dict or None: The inventory data as a dictionary if successful, None otherwise.
    """
    session = requests.Session()
    session.auth = (os.environ["SIMPLE_STACK_UI_USER"], os.environ["SIMPLE_STACK_UI_PASSWORD"])

    try:
        url = f"{os.environ['SIMPLE_STACK_UI_URL']}/api/inventory"
        logging.debug(f"Fetching inventory from {url}")
        r = session.get(url)
        r.raise_for_status()  # Raise an error for bad responses
        result = r.json()  # Directly parse JSON response
        return result
    except requests.exceptions.HTTPError as e:
        logging.error(f"HTTP error occurred: {e}")
    except requests.exceptions.ConnectionError as e:
        logging.error(f"Connection error occurred: {e}")
    except requests.exceptions.Timeout as e:
        logging.error(f"Timeout error occurred: {e}")
    except requests.exceptions.RequestException as e:
        logging.error(f"An error occurred: {e}")
    finally:
        session.close()  # Ensure the session is closed

    return None

# Fetch and print inventory data
inventory = fetch_inventory()
if inventory:
    print(json.dumps(inventory, indent=2))
else:
    logging.error("Failed to retrieve inventory data.")
