FROM debian:trixie

RUN apt-get update && apt-get install -y \
    nginx \
    libnginx-mod-http-modsecurity \
    modsecurity-crs \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/nginx/modsec /etc/nginx/ssl

COPY conf/main.conf /etc/nginx/modsec/main.conf
COPY conf/modsec.conf /etc/nginx/modsec/modsec.conf
COPY conf/nginx.conf /etc/nginx/nginx.conf

WORKDIR /ngx
COPY MyNginx.sh .
RUN chmod +x MyNginx.sh

CMD ["./MyNginx.sh"]