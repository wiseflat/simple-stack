#!/bin/sh

apk update
apk add --no-cache python3 py3-pip
pip install  --break-system-packages -U "huggingface_hub[cli]" hf-transfer

mkdir -p /models/${MODEL}

echo "Download model ..."
hf download meta-llama/${MODEL} --local-dir /models/${MODEL}