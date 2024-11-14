from __future__ import (absolute_import, division, print_function)
from ansible.module_utils.basic import AnsibleModule, missing_required_lib
from filelock import Timeout, FileLock
import os
import atexit
import traceback
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom
from hashlib import sha256
from pykeepass import PyKeePass
import pykeepass.exceptions


# functions for checking

def check_pykeepass_present():
    LIB_IMPORT_ERR = None
    try:
        from pykeepass import PyKeePass
        import pykeepass.exceptions
    except ImportError:
        LIB_IMPORT_ERR = traceback.format_exc()
        pykeepass_present = False
    else:
        pykeepass_present = True
    return pykeepass_present, LIB_IMPORT_ERR


def check_variables(module, var1, var2, var1_name, var2_name):
    if not var1 and not var2:
        module.fail_json(msg=f"Required: '{var1_name}' or '{var2_name}'.")


def check_group_path_is_root(group_path):
    if not group_path or group_path.lower() in ['', "root"]:
        return True
    return False


def check_database_exists(module, path, password, keyfile):
    try:
        PyKeePass(path, password=password, keyfile=keyfile)
        return True
    except FileNotFoundError:
        return False
    except pykeepass.exceptions.CredentialsError:
        KEEPASS_OPEN_ERR = traceback.format_exc()
        module.fail_json(msg='Database exists but the credentials are wrong.')
    except (pykeepass.exceptions.HeaderChecksumError, pykeepass.exceptions.PayloadChecksumError):
        KEEPASS_OPEN_ERR = traceback.format_exc()
        module.fail_json(msg='Database exists but could not open it, as the checksum of the database is wrong. This could be caused by a corrupt database.')
    except Exception as e:
        KEEPASS_OPEN_ERR = traceback.format_exc()
        module.fail_json(msg=f"An unexpected error occurred: {str(e)}")


def check_entry_needs_change(kp, group_path, title, username, password, url, expiry_time, notes, tags):
    try:
        if check_group_path_is_root(group_path):
            group = 'Root'
        else:
            group = group_path.split('/')[-1]
        # get entry from database
        fetched_entry = get_entry(kp, title, group_path, True)
        if fetched_entry is None:
            return False
        # create variable to compare
        database_entry = {}
        (
            database_entry['title'],
            database_entry['group'],
            database_entry['username'],
            database_entry['password'],
            database_entry['url'],
            database_entry['expires'],
            database_entry['expiry_time'],
            database_entry['notes'],
            database_entry['tags']
        ) = fetched_entry
        # check if entries match
        entry = {
            'title': title,
            'group': group,
            'username': username,
            'password': password,
            'url': url,
            'expiry_time': expiry_time,
            'notes': notes,
            'tags': tags
            }
        for key in entry:
            if key in database_entry:
                if entry[key] != database_entry[key]:
                    return True
        return False
    except Exception as e:
        raise e


# functions for database

def open_database(module, database, password, keyfile):
    try:
        kp = PyKeePass(database, password=password, keyfile=keyfile)
        return kp
    except IOError:
        KEEPASS_OPEN_ERR = traceback.format_exc()
        module.fail_json(msg='Could not open the database or keyfile.')
    except pykeepass.exceptions.CredentialsError:
        KEEPASS_OPEN_ERR = traceback.format_exc()
        module.fail_json(msg='Could not open database - credentials are wrong.')
    except (pykeepass.exceptions.HeaderChecksumError, pykeepass.exceptions.PayloadChecksumError):
        KEEPASS_OPEN_ERR = traceback.format_exc()
        module.fail_json(msg='Could not open database - the checksum of the database is wrong. This could be caused by a corrupt database.')
    except Exception as e:
        KEEPASS_OPEN_ERR = traceback.format_exc()
        module.fail_json(msg=f"An unexpected error occurred: {str(e)}")


def attempt_lock(module, database, timeout):
    try:
        database_dir, database_file = os.path.split(database)
        database_file_lock = os.path.join(database_dir, "." + database_file + ".lock")
        lock = FileLock(database_file_lock, timeout=timeout)
        atexit.register(lambda: remove_file_lock(database_file_lock))
        return lock
    except Timeout as e:
        module.fail_json(msg=f"Could not acquire lock on database (timeout: { timeout }) s. Traceback: { str(e) }")


def remove_file_lock(database_file_lock):
    try:
        os.remove(database_file_lock)
    except FileNotFoundError:
        return


# functions for entry

def get_entry(kp, title, group_path, details):
    group = get_group(kp, group_path, False)
    entry = kp.find_entries(title=title, group=group, first=True)
    if entry:
        if details:
            return (entry.title, entry.parentgroup.name, entry.username, entry.password, entry.url, entry.expires, entry.expiry_time, entry.notes, entry.tags)
        return entry
    return None


def create_entry(kp, group_path, title, username, password, url, expiry_time, notes, tags, force_creation):
    try:
        if check_group_path_is_root(group_path):
            group_path = "Root"
            group = kp.root_group
        else:
            group = get_group(kp, group_path, False)
        entry = get_entry(kp, title, group_path, False)
        if entry:
            if check_entry_needs_change(kp, group_path, title, username, password, url, expiry_time, notes, tags) and not force_creation:
                kp.delete_entry(entry)
            elif not force_creation:
                return False
        kp.add_entry(destination_group=group, title=title, username=username, password=password, url=url, expiry_time=expiry_time, notes=notes, tags=tags, force_creation=force_creation)
        kp.save()
        return True
    except Exception as e:
        if "already exists" in str(e):
            return False
        else:
            raise e


def remove_entry(kp, title, group_path):
    entry = get_entry(kp, title, group_path, False)
    if entry:
        kp.delete_entry(entry)
        kp.save()
        return True
    return False


# functions for group

def get_group(kp, group_path, check_only):
    if check_group_path_is_root(group_path):
        current_group = kp.root_group
    else:
        groups = group_path.split('/')
        destination_group = kp.root_group
        for group in groups:
            current_group = kp.find_groups(group=destination_group, name=group, first=True)
            if not current_group:
                return False
            destination_group = current_group
    if check_only:
        return True
    return current_group


def create_group(kp, group_path):
    if check_group_path_is_root(group_path):
        return False
    groups = group_path.split('/')
    destination_group = kp.root_group
    for group in groups:
        current_group = kp.find_groups(group=destination_group, name=group, first=True)
        if not current_group:
            destination_group = kp.add_group(destination_group=destination_group, group_name=group)
            kp.save()
        else:
            destination_group = current_group
    return True


def remove_group(kp, group_path):
    if check_group_path_is_root(group_path):
        return False
    else:
        if get_group(kp, group_path, True):
            group = get_group(kp, group_path, False)
            kp.delete_group(group)
            kp.save()
            return True
        return False


# functions for keyfile

def split_into_blocks(string):
    blocks_per_line = 4
    blocks = [string[i:i+8] for i in range(0, len(string), 8)]
    lines = [blocks[i:i+blocks_per_line] for i in range(0, len(blocks), blocks_per_line)]
    return '\n            '.join([' '.join(line) for line in lines])


def generate_keyfile(path):
    # Generate random key
    key = os.urandom(32).hex().upper()
    # Get 8 first chars of key's hash
    hash = sha256(bytes.fromhex(key)).hexdigest().upper()[0:8]

    # Create XML structure
    keyfile_content = Element('KeyFile')
    meta = SubElement(keyfile_content, 'Meta')
    version = SubElement(meta, 'Version')
    version.text = '2.0'
    key_element = SubElement(keyfile_content, 'Key')
    data = SubElement(key_element, 'Data', Hash=hash)

    # Ensure proper indentation
    data.text = '\n            ' + split_into_blocks(key) + '\n        '

    # Pretty XML
    xml_string = tostring(keyfile_content, 'utf-8')
    xml_pretty = minidom.parseString(xml_string).toprettyxml(indent="    ")

    # Remove XML declaration from minidom
    xml_pretty = '\n'.join(xml_pretty.split('\n')[1:])

    # Write XML to file
    with open(path, 'wb') as keyfile:
        keyfile.write(b'<?xml version="1.0" encoding="utf-8"?>\n')
        keyfile.write(xml_pretty.encode('utf-8'))
