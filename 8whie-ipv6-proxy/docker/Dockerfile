# ==============================================================================
# 8WHIE IPv6 Proxy Manager - Hardened Minimalist Dockerfile
# Developer: Aryan Thakur
# Brand: 8WHIE
# ==============================================================================

FROM python:3.11-slim-bookworm

LABEL maintainer="Aryan Thakur <contact@8whie.internal>"
LABEL brand="8WHIE"
LABEL project="8WHIE IPv6 Proxy Manager"

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    WHIE_CONFIG_PATH=/etc/8whie-proxy/config.json

# Install minimal networking tools for IPv6 querying
RUN apt-get update && apt-get install -y --no-install-recommends \
    iproute2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged application user
RUN groupadd -g 10001 whieproxy && \
    useradd -u 10001 -g whieproxy -s /bin/false -m -d /opt/8whie-proxy whieproxy

WORKDIR /opt/8whie-proxy

# Install dependencies
COPY requirements.txt setup.py ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY src/ ./src/
COPY config/proxy_config.example.json /etc/8whie-proxy/config.json
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Prepare directory ownership
RUN mkdir -p /var/log/8whie-proxy /run/8whie-proxy /etc/8whie-proxy && \
    chown -R whieproxy:whieproxy /opt/8whie-proxy /var/log/8whie-proxy /run/8whie-proxy /etc/8whie-proxy && \
    chmod 700 /etc/8whie-proxy && \
    chmod 600 /etc/8whie-proxy/config.json

USER whieproxy

EXPOSE 8080 1080

ENTRYPOINT ["/entrypoint.sh"]
CMD ["start", "all"]
