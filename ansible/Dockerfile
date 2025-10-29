FROM ubuntu:25.04

ARG JAVA_VERSION=21

RUN apt-get update && apt-get install --no-install-recommends -y \
    bash \
    vim \
    git \
    curl \
    unzip \
    wget \
    openjdk-${JAVA_VERSION}-jdk-headless \
    openssh-client \
    python3-pip \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /tmp/terraform /root/.ssh && \
    cd /tmp/terraform && \
    wget https://releases.hashicorp.com/terraform/1.12.1/terraform_1.12.1_linux_arm64.zip && \
    unzip terraform_1.12.1_linux_arm64.zip && \
    mv terraform /usr/local/bin/

COPY . /ansible

WORKDIR /ansible

RUN pip install --break-system-packages -r requirements.txt

WORKDIR /ansible

RUN ansible-galaxy collection install -r requirements.yml -p ./collections

CMD ["ansible-rulebook", "-r", "rulebook.yml", "-i", "inventory.py", "-v"]
