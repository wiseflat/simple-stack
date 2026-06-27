#!/usr/bin/python3

import argparse
import sys
import os
import pprint as ppprint
import json
import requests
from datetime import datetime
import re
import markdown
import errno
import time
# for retries
from requests.adapters import HTTPAdapter
from urllib3.util import Retry
import magic

import emoji # for reactions

## TODO
# Handle topic/announcement/announcementDetails/md of original room

# globals
roomsfile = "rocketchat_rooms.json"
usersfile = "rocketchat_users.json"
histfile = "rocketchat_messages.json"
verbose = False
dry_run = False
messages_cachefile = "messages_cache.txt"
users_cachefile = "users_cache.txt"
rooms_cachefile = "rooms_cache.txt"


class DryRunResponse:
    """Mock response for dry-run mode"""
    def __init__(self, method, url, context=""):
        self.status_code = 200
        self._method = method
        self._url = url
        self._context = context
        self._fake_room_id = "!dryrun_" + str(DryRunResponse._counter) + ":localhost"
        self._fake_event_id = "$dryrun_" + str(DryRunResponse._counter)
        self._fake_mxc = "mxc://localhost/dryrun_" + str(DryRunResponse._counter)
        DryRunResponse._counter += 1

    _counter = 0

    def json(self):
        return {
            "access_token": "dryrun_token",
            "room_id": self._fake_room_id,
            "event_id": self._fake_event_id,
            "content_uri": self._fake_mxc,
            "creator": "@admin:localhost",
        }


class DryRunSession:
    """Wraps a requests.Session to intercept writes in dry-run mode"""
    def __init__(self, real_session):
        self._session = real_session

    def _handle_rate_limit(self, response, method, url, kwargs):
        """Retry on 429 M_LIMIT_EXCEEDED and transient 502/503/504"""
        retries = 0
        while response.status_code == 429 and retries < 10:
            try:
                wait_ms = response.json().get('retry_after_ms', 5000)
            except Exception:
                wait_ms = 5000
            wait_s = (wait_ms / 1000) + 1
            print(f"  [RATE-LIMITED] waiting {wait_s:.0f}s before retry...")
            time.sleep(wait_s)
            response = method(url, **kwargs)
            retries += 1
        gateway_retries = 0
        while response.status_code in (502, 503, 504) and gateway_retries < 3:
            wait_s = 5 * (gateway_retries + 1)
            print(f"  [GATEWAY ERROR {response.status_code}] waiting {wait_s}s before retry...")
            time.sleep(wait_s)
            response = method(url, **kwargs)
            gateway_retries += 1
        return response

    def get(self, url, **kwargs):
        if dry_run:
            print(f"  [DRY-RUN] GET {url}")
            return DryRunResponse("GET", url)
        response = self._session.get(url, **kwargs)
        return self._handle_rate_limit(response, self._session.get, url, kwargs)

    def post(self, url, **kwargs):
        if dry_run:
            print(f"  [DRY-RUN] POST {url}")
            return DryRunResponse("POST", url)
        response = self._session.post(url, **kwargs)
        return self._handle_rate_limit(response, self._session.post, url, kwargs)

    def put(self, url, **kwargs):
        if dry_run:
            print(f"  [DRY-RUN] PUT {url}")
            return DryRunResponse("PUT", url)
        response = self._session.put(url, **kwargs)
        return self._handle_rate_limit(response, self._session.put, url, kwargs)

    def mount(self, prefix, adapter):
        self._session.mount(prefix, adapter)


# pretty printing functions, switched by verbose argument
def terminal_size():
    import fcntl
    import termios
    import struct
    h, w, hp, wp = struct.unpack('HHHH', fcntl.ioctl(0, termios.TIOCGWINSZ, struct.pack('HHHH', 0, 0, 0, 0)))
    return w, h

def pprint(name, data):
    if verbose:
        w, h = terminal_size()
        pp = ppprint.PrettyPrinter(indent=2, width=w)
        print(name + ": ")
        pp.pprint(data)
        print("\n\n")

def vprint(data):
    if verbose:
        print(str(data))
        print("\n\n")

def safe_json(response):
    """Safely parse JSON from response, return empty dict on failure"""
    try:
        return response.json()
    except Exception:
        return {}

def is_forbidden(response):
    """Check if response is a 403 M_FORBIDDEN"""
    return response.status_code == 403 and safe_json(response).get('errcode') == 'M_FORBIDDEN'

# Arguments parser
def createArgParser():
    parser = argparse.ArgumentParser(description='Launches RC2Matrix migration')
    parser.add_argument("-i", type=str, help='inputs folder, defaults to inputs/', dest="inputs", default="inputs/")
    parser.add_argument("-n", type=str, help='Matrix server', dest="hostname", default="localhost")
    parser.add_argument("-u", type=str, help='Admin username', dest="username", default="admin")
    parser.add_argument("-p", type=str, help='Admin password', dest="password", default="password")
    parser.add_argument("-t", type=str, help='Admin token', dest="token", default=None )
    parser.add_argument("-a", type=str, help='Application token', dest="apptoken", default=None )
    parser.add_argument("-f", type=str, help='Only import messages from this date (ISO format, e.g. 2024-01-01)', dest="fromdate", default=None)
    parser.add_argument("-k", help='Disable TLS certificate check', dest="nocertcheck", action="store_true")
    parser.add_argument("-d", help='Dry-run mode (no API calls)', dest="dryrun", action="store_true")
    parser.add_argument("-v", help='verbose', dest="verbose", action="store_true")

    return parser

# Try to format a markdown message into html
def format_message(raw):
    #formatted = raw
    #formatted = re.sub("```(.+)```", "<code>\\1</code>", formatted)
    #formatted = re.sub("`(.+)`", "<code>\\1</code>", formatted)
    formatted = markdown.markdown(raw)
    if len(formatted) <= len(raw)+7: # markdown adds <p></p> tags
        api_params = {'msgtype': 'm.text', 'body': raw}
    else:
        api_params = {'msgtype': 'm.text', 'body': raw,
            "format": "org.matrix.custom.html",
            "formatted_body": formatted}

    return api_params

# Add a related event, currently unused
def relate_message(raw, ancestor):
    api_params = {'msgtype': 'm.text', 'body': raw,
        "m.relates_to": {
            "m.in_reply_to": {
                "event_id": ancestor
                }
            }
        }

    return api_params

def invite(api_base, api_headers_admin, tgtroom, tgtuser):

    # Method 1, use admin user (possible for public rooms)
    api_endpoint = api_base + "_synapse/admin/v1/join/" + tgtroom
    api_params = {'user_id': tgtuser}
    response = session.post(api_endpoint, json=api_params, headers=api_headers_admin)
    vprint(response.json())

    if response.status_code != 200:
        # Method 2, use AS to invite as creator, then join as tgtuser via AS

        # Get creator
        api_endpoint = api_base + "/_synapse/admin/v1/rooms/" + tgtroom
        response = session.get(api_endpoint, headers=api_headers_admin)
        vprint(response.json())
        creator = response.json().get("creator")

        if creator:
            # Invite tgtuser as creator via AS
            api_endpoint = api_base + "_matrix/client/v3/rooms/" + tgtroom + "/invite?user_id=" + requests.utils.quote(creator)
            api_params = {'user_id': tgtuser}
            response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
            vprint(response.json())

        # Join as tgtuser via AS
        api_endpoint = api_base + "_matrix/client/v3/rooms/" + tgtroom + "/join?user_id=" + requests.utils.quote(tgtuser)
        response = session.post(api_endpoint, json={}, headers=api_headers_as)
        vprint(response.json())

        # Check join
        if response.status_code != 200:
            print("error inviting " + tgtuser + " to " + tgtroom)
            print(response.json())
            exit(1)


if __name__ == '__main__':
    parser = createArgParser()
    args = parser.parse_args()
    verbose = args.verbose
    dry_run = args.dryrun
    mime = magic.Magic(mime=True)

    if dry_run:
        print("=== DRY-RUN MODE — no changes will be made ===")

    if (verbose):
        print("Arguments are: ", args)

    if (args.nocertcheck):
        import ssl
        ssl._create_default_https_context = ssl._create_unverified_context
        ssl.SSLContext.verify_mode = property(lambda self: ssl.CERT_NONE, lambda self, newval: None)
        from urllib3.exceptions import InsecureRequestWarning
        requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

    api_base = "https://" + args.hostname + "/"

    # Obtain an admin token if not provided
    if args.token is None and os.environ.get('MATRIX_ADMIN_TOKEN') is None and not dry_run:
        api_endpoint = api_base + "_matrix/client/v3/login"
        api_params = {"type": "m.login.password","user": args.username,"password": args.password,"device_id": "rc2m"}
        response = requests.post(api_endpoint, json=api_params)
        vprint(response.json())
        if response.status_code == 200:
            token=response.json()["access_token"]
            vprint("Token is " + token)
            exit(0)
        else:
            exit("failed to connect")

    # admin allows to connect as the admin user, as allows to connect as the application service
    token = args.token or os.environ.get('MATRIX_ADMIN_TOKEN') or 'dryrun'
    apptoken = args.apptoken or os.environ.get('MATRIX_APP_TOKEN') or 'dryrun'
    api_headers_admin =  {"Authorization":"Bearer " + token}
    api_headers_as =  {"Authorization":"Bearer " + apptoken}

    print(f"Target: {api_base}")

    # retry in case of error
    real_session = requests.Session()
    retry = Retry(connect=3, backoff_factor=0.5)
    adapter = HTTPAdapter(max_retries=retry)
    real_session.mount('http://', adapter)
    real_session.mount('https://', adapter)
    session = DryRunSession(real_session)

    # Dry-run counters
    dryrun_users = 0
    dryrun_rooms = 0
    dryrun_messages = 0

    # Import users
    print("Importing users...")
    users = set()
    # load cache
    nbcache = 0
    try:
        with open(users_cachefile, encoding='utf8') as f:
            for line in f:
                nbcache+=1
                users.add(line.rstrip('\n'))
        f.close()
        print("Restored " + str(nbcache) + " user ids from cache")
    except FileNotFoundError:
        print("No user cache to restore")
    cache = open(os.devnull, 'a') if dry_run else open(users_cachefile, 'a')
    # import new users
    with open(args.inputs + usersfile, 'r') as jsonfile:
        # Each line is a JSON representing a RC user
        for line in jsonfile:
            currentuser = json.loads(line)
            pprint("current user", currentuser)
            if ("username" not in currentuser):
                continue
            # Skip bot users (rocket.cat, etc.)
            if currentuser.get('type') == 'bot':
                print(f"  Skipping bot user: {currentuser['username']}")
                continue
            username=currentuser['username'].lower()
            if "name" in currentuser and isinstance(currentuser['name'], str):
                displayname=currentuser['name']
            else:
                displayname=username
            if username in users:
                print("user " + username + " already processed (in cache), skipping")
                continue
            print(f"  Creating user: {username} ({displayname})")
            # matrix username will be @username:server
            api_endpoint = api_base + "_synapse/admin/v2/users/@" + username + ":" + args.hostname
            api_params = {"admin": False, "displayname": displayname}
            response = session.put(api_endpoint, json=api_params, headers=api_headers_admin)
            if response.status_code == 500:
                # Synapse bug with displayname on fresh DB, retry without displayname
                print(f"  Retrying without displayname for {username}")
                api_params = {"admin": False}
                response = session.put(api_endpoint, json=api_params, headers=api_headers_admin)
            if response.status_code < 200 or response.status_code > 299: #2xx
                print("error adding user")
                print(currentuser)
                print(response.json())
                print(response.status_code)
                exit(1)

            # avatar
            if "avatarETag" in currentuser:
                try: # try to find the file in the export
                    api_endpoint = api_base + "_matrix/media/v3/upload?user_id=@" + username + ":" + args.hostname + "&filename=" + requests.utils.quote(username)
                    api_headers_file = api_headers_as.copy()
                    localfile=currentuser["avatarETag"]
                    with open(args.inputs + "avatars_users/" + localfile, 'rb') as f:
                        # upload as a media to matrix
                        api_headers_file['Content-Type'] = mime.from_file(args.inputs + "avatars_users/" + localfile)
                        response = session.post(api_endpoint, headers=api_headers_file, data=f)
                    vprint(response.json())
                    if response.status_code != 200: # Upload problem
                        vprint(response)
                        raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), localfile)
                    mxcurl=response.json()['content_uri'] # URI of the uploaded media
                    # Then post a user update referencing this media
                    api_endpoint = api_base + "_synapse/admin/v2/users/@" + username + ":" + args.hostname
                    api_params = {"admin": False, "avatar_url": mxcurl}
                    response = session.put(api_endpoint, json=api_params, headers=api_headers_admin)
                    if response.status_code < 200 or response.status_code > 299: #2xx
                        print("error adding avatar for user")
                        print(currentuser)
                        print(response.json())
                        print(response.status_code)
                        exit(1)

                except FileNotFoundError: # We do not have the linked attachment
                    print("Avatar not found for " + username + ", in " + localfile)

            cache.write(username + "\n")
            dryrun_users += 1
            vprint(response.json())
    cache.close()

    # Import rooms
    print("Importing rooms...")
    roomids = {}  # Map RC_roomID to Matrix_roomID
    # load cache
    nbcache = 0
    try:
        with open(rooms_cachefile, encoding='utf8') as f:
            for line in f:
                nbcache+=1
                atoms = line.rstrip('\n').split('$')
                roomids[atoms[0]] = atoms[1]
        f.close()
        print("Restored " + str(nbcache) + " room ids from cache")
    except FileNotFoundError:
        print("No room cache to restore")
    cache = open(os.devnull, 'a') if dry_run else open(rooms_cachefile, 'a')
    dm_pairs = set()  # Track DM pairs to avoid duplicates
    # Import new rooms
    with open(args.inputs + roomsfile, 'r') as jsonfile:
        # Each line is a JSON representing a RC room
        for line in jsonfile:
            currentroom = json.loads(line)
            if currentroom['_id'] in roomids:
                print("room " + currentroom.get('name', currentroom['_id']) + " already processed (in cache), skipping")
                continue
            pprint("current room", currentroom)

            # Use AS token with user_id to bypass rate limiting
            api_headers_create = api_headers_as
            create_user_id = None
            if 'u' in currentroom:
                try:
                    owner_id = "@" + currentroom['u']['username'].lower() + ":" + args.hostname
                    api_endpoint = api_base + "_synapse/admin/v2/users/" + owner_id
                    vprint(api_endpoint)
                    response = session.get(api_endpoint, headers=api_headers_admin)
                    vprint(response.json())
                    if not 'errcode' in response.json():
                        create_user_id = owner_id
                except:
                    pass

            api_endpoint = api_base + "_matrix/client/v3/createRoom"
            if create_user_id:
                api_endpoint += "?user_id=" + requests.utils.quote(create_user_id)

            # Check if room already exists before creating (avoid duplicates on re-run)
            if currentroom['t'] == 'c' or currentroom['t'] == 'p':
                roomname = currentroom['name']
                alias = "#" + roomname + ":" + args.hostname
                api_endpoint_check = api_base + "_matrix/client/v3/directory/room/" + requests.utils.quote(alias)
                response_check = session.get(api_endpoint_check, headers=api_headers_admin)
                if response_check.status_code == 200:
                    print(f"  Room already exists (alias {alias}), reusing")
                    roomids[currentroom['_id']] = response_check.json()['room_id']
                    cache.write(currentroom['_id'] + "$" + response_check.json()['room_id'] + "\n")
                    continue
            elif currentroom['t'] == 'd':
                dm_key = tuple(sorted(u.lower() for u in currentroom['usernames']))
                roomname = "ZZ-" + "-".join(dm_key)
                # Search for existing DM by name (search all pages)
                search_url = api_base + "_synapse/admin/v1/rooms?search_term=" + requests.utils.quote(roomname) + "&limit=100"
                response_check = session.get(search_url, headers=api_headers_admin)
                if response_check.status_code == 200:
                    for room in response_check.json().get('rooms', []):
                        if room['name'].lower() == roomname.lower():
                            print(f"  DM already exists ({roomname}), reusing")
                            roomids[currentroom['_id']] = room['room_id']
                            cache.write(currentroom['_id'] + "$" + room['room_id'] + "\n")
                            break
                    if currentroom['_id'] in roomids:
                        continue

            if currentroom['t'] == 'd': # DM, create a private chatroom
                dm_key = tuple(sorted(u.lower() for u in currentroom['usernames']))
                if dm_key in dm_pairs:
                    print("Skipping duplicate DM: " + str(dm_key))
                    continue
                dm_pairs.add(dm_key)
                roomname="ZZ-" + "-".join(dm_key)
                api_params = {"visibility": "private", "name": roomname, "join_rules": "invite", 'is_direct': 'true'}
            elif currentroom['t'] == 'c': # public chatroom
                roomname=currentroom['name']
                if 'announcement' in currentroom: # there is a topic
                    api_params = {"visibility": "public", "name": roomname, "room_alias_name": roomname, 'topic': currentroom['announcement']}
                else:
                    api_params = {"visibility": "public", "name": roomname, "room_alias_name": roomname}
            elif currentroom['t'] == 'p': # private chatroom
                roomname=currentroom['name']
                if 'announcement' in currentroom: # there is a topic
                    api_params = {"visibility": "private", "join_rules": "invite", "name": roomname, "room_alias_name": roomname, 'topic': currentroom['announcement']}
                else:
                    api_params = {"visibility": "private", "join_rules": "invite", "name": roomname, "room_alias_name": roomname}
            else:
                print("Skipping unsupported room type: " + currentroom['t'] + " (" + currentroom.get('name', currentroom['_id']) + ")")
                continue
            print(f"  Creating room: {roomname} (type={currentroom['t']})")
            response = session.post(api_endpoint, json=api_params, headers=api_headers_create)
            vprint(response.json())
            if response.status_code == 200: # room created successfully
                roomids[currentroom['_id']] = response.json()['room_id'] # map RC_roomID to Matrix_roomID
                cache.write(currentroom['_id'] + "$" + response.json()['room_id'] + "\n")
                dryrun_rooms += 1
            elif response.status_code == 400 and safe_json(response).get('errcode') == 'M_ROOM_IN_USE': # room already existing, we search it
                #api_endpoint = api_base + "/_matrix/client/v3/publicRooms"
                api_endpoint = api_base + "_synapse/admin/v1/rooms?search_term=" + roomname
                #api_params = {"filter": { "generic_search_term": roomname}}
                vprint(api_endpoint)
                response = session.get(api_endpoint, headers=api_headers_admin)
                if response.status_code != 200:
                    print("error getting room")
                    print("current room", currentroom)
                    print(response.json())
                    exit(1)
                vprint(response.json())
                found = False
                for room in response.json()['rooms']:
                    if room['name'].lower() == roomname.lower():
                        found = True
                        roomids[currentroom['_id']] = room['room_id'] # map RC_roomID to Matrix_roomID
                        cache.write(currentroom['_id'] + "$" + room['room_id'] + "\n")
                if not found:
                    # Fallback: resolve alias directly
                    alias = "#" + roomname + ":" + args.hostname
                    api_endpoint_alias = api_base + "_matrix/client/v3/directory/room/" + requests.utils.quote(alias)
                    response_alias = session.get(api_endpoint_alias, headers=api_headers_admin)
                    if response_alias.status_code == 200:
                        found = True
                        roomids[currentroom['_id']] = response_alias.json()['room_id']
                        cache.write(currentroom['_id'] + "$" + response_alias.json()['room_id'] + "\n")
                        print(f"  Resolved via alias: {alias} -> {response_alias.json()['room_id']}")
                if not found:
                    print("error finding room")
                    print("current room", currentroom)
                    print(response.json())
                    exit(1)
                # roomids[currentroom['_id']] = response.json()['rooms'][0]['room_id'] # map RC_roomID to Matrix_roomID
            else:
                print("current room", currentroom)
                print(response.json())
                exit("Unsupported fail for room creation")
            # rooms.append(json.loads(line))

            # Make old owner admin of this new room
            try:
                api_endpoint = api_base + "_synapse/admin/v1/rooms/" + roomids[currentroom['_id']] + "/make_room_admin"
                api_params = {"user_id": "@" + currentroom['u']['username'].lower() + ":" + args.hostname}
                response = session.post(api_endpoint, json=api_params, headers=api_headers_admin)
                if response.status_code != 200:
                    print("error setting admin")
                    print("current room", currentroom)
                    print(response.json())
                    exit(1)
                vprint(response.json())
            except:
                pass

            # avatar
            if "avatarETag" in currentroom:
                try: # try to find the file in the export
                    api_endpoint = api_base + "_matrix/media/v3/upload?user_id=@" + currentroom['u']['username'].lower() + ":" + args.hostname + "&filename=" + requests.utils.quote(roomids[currentroom['_id']])
                    api_headers_file = api_headers_as.copy()
                    localfile=currentroom["avatarETag"]
                    with open(args.inputs + "avatars_rooms/" + localfile, 'rb') as f:
                        # upload as a media to matrix
                        api_headers_file['Content-Type'] = mime.from_file(args.inputs + "avatars_rooms/" + localfile)
                        response = session.post(api_endpoint, headers=api_headers_file, data=f)
                    vprint(response.json())
                    if response.status_code != 200: # Upload problem
                        vprint(response)
                        raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), localfile)
                    mxcurl=response.json()['content_uri'] # URI of the uploaded media
                    # Then post a room update referencing this media
                    invite(api_base, api_headers_admin, roomids[currentroom['_id']], '@' + currentroom['u']['username'].lower() + ":" + args.hostname)
                    api_endpoint = api_base + "_matrix/client/v3/rooms/" + roomids[currentroom['_id']] + '/state/m.room.avatar/?user_id=@' + currentroom['u']['username'].lower() + ":" + args.hostname
                    api_params = {"url": mxcurl}
                    response = session.put(api_endpoint, json=api_params, headers=api_headers_as)
                    vprint(response.json())
                    if response.status_code < 200 or response.status_code > 299: #2xx
                        print("error adding avatar for room")
                        print(currentroom)
                        print(response.json())
                        print(response.status_code)
                        exit(1)

                except FileNotFoundError: # We do not have the linked attachment
                    print("Avatar not found for " + roomname + ", in " + localfile)

    cache.close()
    pprint("room ids", roomids)

    # Messages
    print("Importing messages...")
    # Load and sort messages by timestamp
    print("  Loading messages file...")
    messages = []
    with open(args.inputs + histfile, 'r') as jsonfile:
        for line in jsonfile:
            messages.append(json.loads(line))
    print(f"  Sorting {len(messages)} messages by timestamp...")
    messages.sort(key=lambda m: m.get('ts', {}).get('$date', ''))
    # Filter messages by --fromdate if specified
    if args.fromdate:
        fromdate_dt = datetime.fromisoformat(args.fromdate)
        print(f"  Filtering messages from {args.fromdate} onwards...")
        messages = [m for m in messages if m.get('ts', {}).get('$date', '') >= args.fromdate]
        print(f"  {len(messages)} messages after filtering")
    nblines = len(messages)
    lastts = 0
    currentline = 0
    idmaps = {} # map RC_messageID to Matrix_messageID for threads, replies, ...

    # load cache
    nbcache = 0
    try:
        with open(messages_cachefile, encoding='utf8') as f:
            for line in f:
                nbcache+=1
                atoms = line.rstrip('\n').split(':')
                idmaps[atoms[0]] = atoms[1]
        f.close()
        print("Restored " + str(nbcache) + " message ids from cache")
    except FileNotFoundError:
        print("No message cache to restore")
    cache = open(os.devnull, 'a') if dry_run else open(messages_cachefile, 'a')

    for currentmsg in messages:
            currentline+=1
            print("Importing message " + str(currentline) + "/" + str(nblines), end='')
            pprint("current message", currentmsg)
            finished=False # set to true to not (re)print the message in the final step
            response=None
            if 'rid' not in currentmsg:
                print(", skipping (no rid)")
                continue
            if currentmsg['rid'] in roomids:
                tgtroom = roomids[currentmsg['rid']] # tgtroom is the matrix room
                tgtuser = "@" + currentmsg['u']['username'].lower() + ":" + args.hostname # tgtuser is the matrix user

                # Skip messages from bot users
                if currentmsg['u']['username'].lower() == 'rocket.cat':
                    print(", skipping (bot user rocket.cat)")
                    continue

                dateTimeObj = datetime.fromisoformat(currentmsg['ts']['$date'])
                tgtts = int(dateTimeObj.timestamp()*1000) # tgtts is the message timestamp
                if currentmsg['_id'] in idmaps:
                    print(", already processed (in cache), skipping")
                    continue
                print(", timestamp=" + str(tgtts))
                lastts = tgtts

                # Pinned messages, unhandled
                if 't' in currentmsg and currentmsg['t']=="message_pinned":
                    print(", timestamp=" + str(tgtts) + ", message pinning event, skipping")
                    continue

                # Jitsi start messages, unhandled
                if 't' in currentmsg and currentmsg['t']=="jitsi_call_started":
                   print(", timestamp=" + str(tgtts) + ", jitsi_call event, skipping")
                   continue

                # First, iterate attachments
                # https://developer.rocket.chat/reference/api/rest-api/endpoints/messaging/chat-endpoints/send-message#attachment-field-objects
                if 'attachments' in currentmsg and hasattr(currentmsg['attachments'], '__iter__'):
                    for attachment in currentmsg['attachments']:
                        if ('type' in attachment and attachment['type'] == 'file') or ('title_link' in attachment and '/file-upload/' in attachment['title_link']): # A file
                            vprint("a file")
                            api_endpoint = api_base + "_matrix/media/v3/upload?user_id=" + tgtuser + "&ts=" + str(tgtts) + "&filename=" + requests.utils.quote(attachment['title'])
                            api_headers_file = api_headers_as.copy()
                            if 'image_type' in attachment: # we have a content-type
                                vprint("an image")
                                api_headers_file['Content-Type'] = attachment['image_type']
                            try: # try to find the file in the export
                                localfile=attachment['title_link']
                                localfile=re.sub("/file-upload/", "", localfile)
                                localfile=re.sub("/.*", "", localfile)
                                filepath = args.inputs + "files/" + localfile
                                if not os.path.exists(filepath):
                                    print(f"    [MISSING FILE] {filepath} (title_link={attachment['title_link']})")
                                    raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), localfile)
                                with open(filepath, 'rb') as f:
                                    # upload as a media to matrix
                                    if 'Content-Type' not in api_headers_file:
                                        api_headers_file['Content-Type'] = mime.from_file(filepath)
                                    response = session.post(api_endpoint, headers=api_headers_file, data=f)
                                try:
                                    vprint(response.json())
                                except Exception:
                                    vprint(f"Response status={response.status_code}, no JSON body")
                                if response.status_code != 200: # Upload problem
                                    print(f"    [UPLOAD FAILED] {response.status_code} {safe_json(response)}")
                                    raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), localfile)
                                upload_data = safe_json(response)
                                if 'content_uri' not in upload_data:
                                    print(f"    [UPLOAD FAILED] no content_uri in response: {upload_data}")
                                    raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), localfile)
                                mxcurl=upload_data['content_uri'] # URI of the uploaded media
                                # Then post a message referencing this media
                                api_endpoint = api_base + "_matrix/client/v3/rooms/" + tgtroom + '/send/m.room.message?user_id=' + tgtuser + "&ts=" + str(tgtts) # ts, ?user_id=@_irc_user:example.org
                                if 'image_type' in attachment: # attachment is an image
                                    api_params = {'msgtype': 'm.image', 'body': attachment['title'], 'url': mxcurl}
                                else: # other files
                                    api_params = {'msgtype': 'm.file', 'body': attachment['title'], 'url': mxcurl}
                                response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                                if is_forbidden(response): # not in the room
                                    invite(api_base, api_headers_admin, tgtroom, tgtuser)
                                    response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                                if response.status_code != 200:
                                    print("error posting attachment")
                                    print(attachment['title'])
                                    print(safe_json(response))
                                    exit(1)
                                vprint(safe_json(response))
                            except FileNotFoundError: # We do not have the linked attachment
                                api_endpoint = api_base + "_matrix/client/v3/rooms/" + tgtroom + '/send/m.room.message?user_id=' + tgtuser + "&ts=" + str(tgtts) # ts, ?user_id=@_irc_user:example.org
                                api_params = {'msgtype': 'm.text', 'body': "<<< A file named \"" + attachment['title'] + "\" was lost during the migration to Matrix >>>"}
                                response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                                if is_forbidden(response): # not in the room
                                    invite(api_base, api_headers_admin, tgtroom, tgtuser)
                                    response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                                if response.status_code != 200:
                                    print(f"  [WARN] could not post placeholder for missing attachment: {attachment['title']} (status={response.status_code})")
                                else:
                                    vprint(safe_json(response))
                            if 'description' in attachment: # Matrix does not support descriptions, we post as a message
                                api_endpoint = api_base + "_matrix/client/v3/rooms/" + tgtroom + '/send/m.room.message?user_id=' + tgtuser + "&ts=" + str(tgtts) # ts, ?user_id=@_irc_user:example.org
                                api_params = {'msgtype': 'm.text', 'body': attachment['description']}
                                response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                                if is_forbidden(response): # not in the room
                                    invite(api_base, api_headers_admin, tgtroom, tgtuser)
                                    response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                                if response.status_code != 200:
                                    print("error posting description")
                                    print(attachment['description'])
                                    print(safe_json(response))
                                    exit(1)
                                vprint(safe_json(response))

                        elif 'message_link' in attachment: # This is a citation
                            vprint("A citation")
                            if 'msg' in currentmsg:
                                textmsg = emoji.emojize(currentmsg['msg'], language='alias')
                            else:
                                textmsg = ""
                            html = markdown.markdown(textmsg) # render the markdown
                            related = re.sub(r".*\?msg=", "", attachment['message_link']) # find related Matrix_messageID
                            api_endpoint = api_base + "_matrix/client/v3/rooms/" + tgtroom + '/send/m.room.message?user_id=' + tgtuser + "&ts=" + str(tgtts) # ts, ?user_id=@_irc_user:example.org
                            if related in idmaps:
                                api_params = {'msgtype': 'm.text', 'body': "> <" + attachment['author_name'] + ">" + attachment['text'] + "\n\n" + textmsg,
                                    "format": "org.matrix.custom.html",
                                    "formatted_body": "<mx-reply><blockquote>In reply to " + attachment['author_name'] + "<br>" + attachment['text'] + "</blockquote></mx-reply>" + html,
                                    "m.relates_to": {
                                        "m.in_reply_to": {
                                            "event_id": idmaps[related]
                                            }
                                        }}
                            else:
                                api_params = {'msgtype': 'm.text', 'body': "> <" + attachment['author_name'] + ">" + attachment['text'] + "\n\n" + textmsg,
                                    "format": "org.matrix.custom.html",
                                    "formatted_body": "<mx-reply><blockquote>In reply to " + attachment['author_name'] + "<br>" + attachment['text'] + "</blockquote></mx-reply>" + html,
                                    }
                            response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                            if is_forbidden(response): # not in the room
                                invite(api_base, api_headers_admin, tgtroom, tgtuser)
                                response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                            if response.status_code != 200:
                                print("error posting related")
                                print(textmsg)
                                print(safe_json(response))
                                exit(1)
                            vprint(safe_json(response))
                            finished=True # do not repost this message in the final step
                        elif 'image_url' in attachment: # This is an external image
                            vprint("An external image")
                            api_endpoint = api_base + "_matrix/client/v3/rooms/" + tgtroom + '/send/m.room.message?user_id=' + tgtuser + "&ts=" + str(tgtts) # ts, ?user_id=@_irc_user:example.org
                            api_params = {'msgtype': 'm.text', 'body': attachment['image_url']}
                            response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                            if is_forbidden(response): # not in the room
                                invite(api_base, api_headers_admin, tgtroom, tgtuser)
                                response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                            if response.status_code != 200:
                                print("error posting image url")
                                print(attachment['image_url'])
                                print(safe_json(response))
                                exit(1)
                            vprint(safe_json(response))
                        else:
                            print("Skipping unsupported attachment: " + str(attachment))

                # Finally post the message
                if 'msg' in currentmsg:
                    if currentmsg['msg'] != "" and not finished:
                        api_endpoint = api_base + "_matrix/client/v3/rooms/" + tgtroom + '/send/m.room.message?user_id=' + tgtuser + "&ts=" + str(tgtts) # ts, ?user_id=@_irc_user:example.org
                        api_params = format_message(emoji.emojize(currentmsg['msg'], language='alias'))
                        response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                        vprint(safe_json(response))

                        if is_forbidden(response): # not in the room
                            invite(api_base, api_headers_admin, tgtroom, tgtuser)
                            response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                            vprint(safe_json(response))

                        if response.status_code != 200:
                            print("error posting message")
                            print(currentmsg['msg'])
                            print(safe_json(response))
                            exit(1)

                # We keep track of messageIDs to link future references
                if response is not None: # is None if no message has been posted, nothing to keep in idmaps in this case
                    idmaps[currentmsg['_id']]=response.json()['event_id']
                    cache.write(currentmsg['_id'] + ":" + response.json()['event_id'] + "\n")
                    dryrun_messages += 1
                else:
                    vprint("No response to get an event_id from")
                    continue

                if 'reactions' in currentmsg and currentmsg['reactions']:
                    for reaction in currentmsg['reactions']:
                        tgtreaction = emoji.emojize(reaction, language='alias')
                        for username in currentmsg['reactions'][reaction]['usernames']:
                            tgtusername = "@" + username.lower() + ":" + args.hostname
                            vprint(tgtusername + ":" + tgtreaction)
                            api_endpoint = api_base + "_matrix/client/v3/rooms/" + tgtroom + '/send/m.reaction?user_id=' + tgtusername + "&ts=" + str(tgtts)
                            api_params = {"m.relates_to": {
                                                "event_id": idmaps[currentmsg['_id']],
                                                "key": tgtreaction,
                                                "rel_type": "m.annotation"
                                                }}
                            response = session.post(api_endpoint, json=api_params, headers=api_headers_as)
                            vprint(response.json())
            else:
                print(", skipping (room not imported)")
                continue

    cache.close()

    if dry_run:
        print("\n=== DRY-RUN SUMMARY ===")
        print(f"  Users to migrate:    {dryrun_users}")
        print(f"  Rooms to create:     {dryrun_rooms}")
        print(f"  Messages to import:  {dryrun_messages}")
        print("=== No changes were made ===")
