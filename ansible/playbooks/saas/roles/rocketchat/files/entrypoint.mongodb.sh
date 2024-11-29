#!/bin/bash

# Start mongodb
start_mongodb()
{
    mongod --config /etc/mongodb/mongod.conf --noauth --fork --syslog --bind_ip 127.0.0.1
    for i in $(seq 30 -1 0); do
        [ -S /var/run/mongod/mongodb-27017.sock ] && break
        echo 'MongoDB init process in progress...'
        sleep 1
    done
    if [ "${i}" = 0 ]; then
        echo >&2 'MongoDB init process failed.'
        exit 1
    fi
}

# Stop mongodb
stop_mongodb()
{
    mongod --config /etc/mongodb/mongod.conf --noauth --fork --syslog --shutdown
    for i in $(seq 30 -1 0); do
        [ ! -f /var/run/mongod/mongod.pid ] || break
        echo 'MongoDB stop process in progress...'
        sleep 1
    done
    if [ "$${i}" = 0 ]; then
        echo >&2 'MongoDB hangs during stop process.'
        exit 1
    fi
}

echo "Start MongoDB"
start_mongodb
sleep 2

if [ ! -f /etc/mongodb/.install.lock ];
then
    echo "replicaSet initiate"
    # initiate mongo replica set
    for i in `seq 1 30`; do
        mongo rocketchat --eval "rs.initiate()" &&
        s=$? && break || s=$?;
        echo "Tried $i times. Waiting 5 secs...";
        sleep 5;
    done;
    mongo --eval "printjson(rs.status())"
    touch /etc/mongodb/.install.lock
fi
stop_mongodb
echo 'MongoDB init process done. Ready for start up.'
sleep 2

mongod --config /etc/mongodb/mongod.conf --bind_ip_all --storageEngine=wiredTiger --replSet rs0
