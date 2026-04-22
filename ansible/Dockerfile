FROM ubuntu:25.04

ARG JAVA_VERSION=21
ARG TERRAFORM_VERSION=1.12.1
ARG TARGETARCH

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
        case "${TARGETARCH}" in \
            amd64|arm64) TF_ARCH="${TARGETARCH}" ;; \
            *) echo "Unsupported TARGETARCH: ${TARGETARCH}" && exit 1 ;; \
        esac && \
    cd /tmp/terraform && \
        wget "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${TF_ARCH}.zip" && \
        unzip "terraform_${TERRAFORM_VERSION}_linux_${TF_ARCH}.zip" && \
    mv terraform /usr/local/bin/

COPY . /ansible

WORKDIR /ansible

RUN pip install --break-system-packages -r requirements.txt

WORKDIR /ansible

RUN ansible-galaxy collection install -r requirements.yml -p ./collections

CMD ["ansible-rulebook", "-r", "rulebook.yml", "-i", "inventory.py", "-v"]
