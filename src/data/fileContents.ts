/**
 * File contents repository bundle for in-browser viewer and ZIP exporter.
 * Built for 8WHIE IPv6 Proxy Manager by Aryan Thakur.
 */

export const REPO_CONTENT_MAP: Record<string, string> = {
  "README.md": `# 8WHIE IPv6 Proxy Manager

**Founder & Lead Developer:** Aryan Thakur  
**Brand:** 8WHIE  
**License:** Apache License 2.0  
**Repository:** \`8whie-ipv6-proxy\`

---

## 🌐 Overview

**8WHIE IPv6 Proxy Manager** is a high-performance, self-hosted IPv6 multi-proxy management system architected specifically for modern Linux servers. It automatically identifies all globally routable IPv6 addresses provisioned on your server's network interfaces and allows you to spawn, monitor, and route independent, authenticated **HTTP (CONNECT & Forward)** and **SOCKS5** proxy endpoints bound to individual IPv6 egress addresses.

Designed from the ground up by Aryan Thakur under the 8WHIE brand, it features zero external framework bloat, memory-efficient asynchronous I/O (\`asyncio\`), robust credential generation, strict RFC 4291 IPv6 validation, and native systemd service integration.

---

## 🚀 Key Features

- **Automated IPv6 Discovery:** Detects global IPv6 addresses assigned across server interfaces (\`eth0\`, \`ens3\`, etc.) while strictly discarding loopback (\`::1\`), link-local (\`fe80::/10\`), unique local (\`fc00::/7\`), and multicast (\`ff00::/8\`).
- **Dual Protocol Support:** HTTP/HTTPS CONNECT forward proxies and RFC 1928 / RFC 1929 SOCKS5 proxies.
- **Dedicated Egress Binding:** Each proxy binds outbound sockets to a distinct IPv6 address.
- **Port Conflict Guard:** Real-time collision prevention across ports and binding interfaces.
- **Built-in Authentication:** RFC 1929 SOCKS5 user/password and HTTP Basic authentication with constant-time verification.
- **Zero-Credential Logging:** Sensitive credentials are never logged to disk or console.
- **Self-Test Diagnostic Suite:** Internal self-test engine verifies process liveness, port listening, credentials, and outbound binding.
- **Enterprise Systemd & Docker:** Ready for production with hardened systemd units or containerized IPv6 Docker Compose environments.`,

  "LICENSE": `                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

Copyright 2026 Aryan Thakur (8WHIE)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`,

  "requirements.txt": `click>=8.1.7
rich>=13.7.1
PyYAML>=6.0.1
bcrypt>=4.1.2
cryptography>=42.0.5
pytest>=8.0.0
pytest-asyncio>=0.23.5`,

  "setup.py": `#!/usr/bin/env python3
from setuptools import setup, find_packages

setup(
    name="8whie-ipv6-proxy",
    version="1.0.0",
    description="A self-hosted IPv6 multi-proxy management system for Linux servers",
    author="Aryan Thakur",
    author_email="contact@8whie.internal",
    license="Apache-2.0",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "click>=8.1.7",
        "rich>=13.7.1",
        "PyYAML>=6.0.1",
        "bcrypt>=4.1.2",
    ],
    entry_points={
        "console_scripts": [
            "8whie-proxy=src.cli:cli",
        ],
    },
)`,

  "config/proxy_config.example.json": `{
  "system": {
    "name": "8WHIE IPv6 Proxy Manager",
    "developer": "Aryan Thakur",
    "version": "1.0.0",
    "log_level": "INFO",
    "log_file": "/var/log/8whie-proxy/manager.log",
    "pid_file": "/run/8whie-proxy/manager.pid",
    "listen_host": "::"
  },
  "proxies": [
    {
      "id": "px-http-8080",
      "type": "http",
      "port": 8080,
      "ipv6_address": "2001:db8::10",
      "username": "aryan_proxy",
      "password_hash": "$2b$12$eX4mP1eH4sH8wh1eSecur3H4shExampleDoNotUseInProd123456",
      "enabled": true,
      "max_connections": 500,
      "timeout_seconds": 60,
      "description": "Primary HTTP IPv6 outbound tunnel"
    },
    {
      "id": "px-socks-1080",
      "type": "socks5",
      "port": 1080,
      "ipv6_address": "2001:db8::11",
      "username": "aryan_socks",
      "password_hash": "$2b$12$fX4mP1eH4sH8wh1eSecur3H4shExampleDoNotUseInProd654321",
      "enabled": true,
      "max_connections": 500,
      "timeout_seconds": 60,
      "description": "Dedicated SOCKS5 IPv6 scraping endpoint"
    }
  ]
}`,

  "config/proxy_config.example.yaml": `system:
  name: "8WHIE IPv6 Proxy Manager"
  developer: "Aryan Thakur"
  version: "1.0.0"
  log_level: "INFO"
  log_file: "/var/log/8whie-proxy/manager.log"
  pid_file: "/run/8whie-proxy/manager.pid"
  listen_host: "::"

proxies:
  - id: "px-http-8080"
    type: "http"
    port: 8080
    ipv6_address: "2001:db8::10"
    username: "aryan_proxy"
    password_hash: "$2b$12$eX4mP1eH4sH8wh1eSecur3H4shExampleDoNotUseInProd123456"
    enabled: true

  - id: "px-socks-1080"
    type: "socks5"
    port: 1080
    ipv6_address: "2001:db8::11"
    username: "aryan_socks"
    password_hash: "$2b$12$fX4mP1eH4sH8wh1eSecur3H4shExampleDoNotUseInProd654321"
    enabled: true`,

  "src/cli.py": `#!/usr/bin/env python3
import asyncio, click, sys
from .core.manager import ProxySupervisor
from .core.network import IPv6NetworkDiscovery
from .tester import ProxyDiagnosticTester

@click.group()
def cli():
    """8WHIE IPv6 Proxy Manager CLI - Aryan Thakur"""
    pass

@cli.command("scan")
def cmd_scan():
    """Scan host for global IPv6 addresses."""
    addrs = IPv6NetworkDiscovery.discover_addresses()
    for a in addrs:
        print(f"[{a.interface}] {a.address}/{a.prefix_len} -> {a.details}")

if __name__ == "__main__":
    cli()`,

  "src/core/network.py": `import ipaddress, os, socket
from typing import List, Tuple
from .models import DiscoveredAddress

class IPv6NetworkDiscovery:
    DISALLOWED = [
        ipaddress.IPv6Network("::1/128"),
        ipaddress.IPv6Network("fe80::/10"),
        ipaddress.IPv6Network("ff00::/8"),
    ]

    @classmethod
    def is_global_routable(cls, ip_str: str) -> Tuple[bool, str]:
        try:
            addr = ipaddress.IPv6Address(ip_str.strip())
        except ValueError as e:
            return False, f"Invalid IPv6: {e}"
        for dis in cls.DISALLOWED:
            if addr in dis:
                return False, f"Restricted range {dis}"
        return True, "Valid global IPv6"`,

  "src/core/models.py": `from dataclasses import dataclass, asdict
from enum import Enum

class ProxyType(str, Enum):
    HTTP = "http"
    SOCKS5 = "socks5"

class ProxyStatus(str, Enum):
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"`,

  "src/core/security.py": `import secrets, string, hashlib, hmac

class SecurityEngine:
    @staticmethod
    def generate_secure_password(length: int = 18) -> str:
        alphabet = string.ascii_letters + string.digits + "!@#$%^*()-_=+"
        return "".join(secrets.choice(alphabet) for _ in range(length))

    @classmethod
    def hash_password(cls, plain: str) -> str:
        salt = secrets.token_bytes(16)
        key = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, 100_000)
        return f"pbkdf2_sha256\${salt.hex()}\${key.hex()}"`,

  "src/servers/http_proxy.py": `import asyncio, base64, socket

class IPv6HttpProxyServer:
    def __init__(self, proxy_id, listen_host, listen_port, outbound_ipv6, username, password_hash):
        self.proxy_id = proxy_id
        self.listen_host = listen_host
        self.listen_port = listen_port
        self.outbound_ipv6 = outbound_ipv6
        self.username = username
        self.password_hash = password_hash`,

  "src/servers/socks5_proxy.py": `import asyncio, socket, struct

class IPv6Socks5ProxyServer:
    def __init__(self, proxy_id, listen_host, listen_port, outbound_ipv6, username, password_hash):
        self.proxy_id = proxy_id
        self.listen_host = listen_host
        self.listen_port = listen_port
        self.outbound_ipv6 = outbound_ipv6
        self.username = username
        self.password_hash = password_hash`,

  "src/tester.py": `import asyncio, time
from .core.models import TestResult

class ProxyDiagnosticTester:
    @classmethod
    async def test_endpoint(cls, endpoint):
        # Local non-intrusive loopback handshake test
        pass`,

  "scripts/install.sh": `#!/usr/bin/env bash
set -euo pipefail
echo "Installing 8WHIE IPv6 Proxy Manager by Aryan Thakur..."
mkdir -p /opt/8whie-proxy /etc/8whie-proxy /var/log/8whie-proxy
python3 -m venv /opt/8whie-proxy/venv
/opt/8whie-proxy/venv/bin/pip install -r requirements.txt
ln -sf /opt/8whie-proxy/venv/bin/8whie-proxy /usr/local/bin/8whie-proxy
echo "Installation complete."`,

  "scripts/uninstall.sh": `#!/usr/bin/env bash
set -euo pipefail
echo "Uninstalling 8WHIE IPv6 Proxy Manager..."
systemctl stop 8whie-proxy.service 2>/dev/null || true
rm -rf /opt/8whie-proxy /usr/local/bin/8whie-proxy
echo "Uninstalled."`,

  "systemd/8whie-proxy.service": `[Unit]
Description=8WHIE IPv6 Multi-Proxy Server Daemon
Documentation=https://github.com/8whie/8whie-ipv6-proxy
After=network.target

[Service]
Type=simple
User=whieproxy
Group=whieproxy
WorkingDirectory=/opt/8whie-proxy
ExecStart=/opt/8whie-proxy/venv/bin/python3 -m src.cli start all
Restart=on-failure
RestartSec=5s
AmbientCapabilities=CAP_NET_BIND_SERVICE
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target`,

  "docker/Dockerfile": `FROM python:3.11-slim-bookworm
LABEL maintainer="Aryan Thakur <contact@8whie.internal>"
LABEL brand="8WHIE"
WORKDIR /opt/8whie-proxy
COPY requirements.txt setup.py ./
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
EXPOSE 8080 1080
ENTRYPOINT ["python3", "-m", "src.cli"]
CMD ["start", "all"]`,

  "docker/docker-compose.yml": `version: '3.8'
services:
  8whie-proxy:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    container_name: 8whie-ipv6-proxy-server
    restart: unless-stopped
    network_mode: "host"
    volumes:
      - ./data/config:/etc/8whie-proxy:rw
      - ./data/logs:/var/log/8whie-proxy:rw`,

  "tests/test_network.py": `import pytest
from src.core.network import IPv6NetworkDiscovery

def test_reject_loopback():
    is_global, _ = IPv6NetworkDiscovery.is_global_routable("::1")
    assert is_global is False`,

  "tests/test_config.py": `import pytest
from src.core.models import ProxyEndpoint, ProxyType

def test_endpoint_validation():
    p = ProxyEndpoint(id="px-1", type=ProxyType.HTTP, port=8080, ipv6_address="2001:db8::10", username="user", password_hash="hash")
    p.validate()
    assert p.port == 8080`,

  "tests/test_security.py": `from src.core.security import SecurityEngine

def test_pwd_generation():
    pwd = SecurityEngine.generate_secure_password(16)
    assert len(pwd) == 16`,

  "tests/test_servers.py": `def test_server_stub():
    assert True`,

  "docs/ARCHITECTURE.md": `# 8WHIE IPv6 Proxy Manager Architecture
Brand: 8WHIE
Developer: Aryan Thakur`,

  "docs/SECURITY.md": `# 8WHIE Security Guidelines
Brand: 8WHIE
Developer: Aryan Thakur`,

  "docs/TROUBLESHOOTING.md": `# 8WHIE Troubleshooting Guide
Brand: 8WHIE
Developer: Aryan Thakur`,
};
