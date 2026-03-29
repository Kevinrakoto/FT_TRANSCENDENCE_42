FROM debian:trixie

RUN apt-get update && apt-get install -y \
    gpg curl lsb-release openssl && \
    curl -fsSL https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/hashicorp.list && \
    apt-get update && apt-get install -y vault

RUN mkdir -p /vault/config

WORKDIR /usr/local/bin

COPY myvault.sh .
COPY config.hcl /vault/config/config.hcl

RUN chmod +x myvault.sh

ENTRYPOINT ["./myvault.sh"]