# 8WHIE IPv6 Proxy Manager

**Founder & Lead Developer:** Aryan Thakur  
**Brand:** 8WHIE  
**License:** Apache License 2.0  
**Repository:** `8whie-ipv6-proxy`

---

## 🌐 Overview

**8WHIE IPv6 Proxy Manager** is a high-performance, self-hosted IPv6 multi-proxy management system architected specifically for modern Linux servers. It automatically identifies all globally routable IPv6 addresses provisioned on your server's network interfaces and allows you to spawn, monitor, and route independent, authenticated **HTTP (CONNECT & Forward)** and **SOCKS5** proxy endpoints bound to individual IPv6 egress addresses.

Designed from the ground up by Aryan Thakur under the 8WHIE brand, it features zero external framework bloat, memory-efficient asynchronous I/O (`asyncio`), robust credential generation, strict RFC 4291 IPv6 validation, and native systemd service integration.

---

## 🚀 Key Features

- **Automated IPv6 Discovery:** Detects global IPv6 addresses assigned across server interfaces (`eth0`, `ens3`, `enp1s0`, etc.) while strictly discarding loopback (`::1`), link-local (`fe80::/10`), unique local (`fc00::/7`), and multicast (`ff00::/8`) addresses.
- **Dual Protocol Support:** Seamlessly deploy both high-speed HTTP/HTTPS forward proxies and RFC 1928 / RFC 1929 compliant SOCKS5 proxies.
- **Dedicated Egress Binding:** Each individual proxy endpoint binds outbound sockets to a distinct IPv6 address, guaranteeing IP isolation for web scraping, automation, and privacy tasks.
- **Port Conflict Guard:** Real-time validation prevents collision across ports, protocols, and binding interfaces.
- **Built-in Authentication:** RFC 1929 user/password authentication for SOCKS5 and HTTP Basic Proxy Authentication with constant-time verification against timing attacks.
- **Zero-Credential Logging:** Sensitive passwords and tokens are never written to disk logs or printed on terminal consoles.
- **Self-Test Diagnostic Suite:** Internal self-test engine verifies process liveness, TCP socket availability, credentials, and egress IPv6 binding without abusing third-party services.
- **Enterprise Systemd & Docker:** Ready for production deployment with hardened systemd units (`ProtectSystem=strict`, `NoNewPrivileges=true`) or containerized IPv6 Docker Compose environments.

---

## 🏗️ Architecture & Component Flow

```
                      [ Linux Server Host ]
                                |
             +------------------+------------------+
             |                                     |
   [ Network Interface: eth0 ]            [ Local Loopback / Admin ]
   Subnet: 2001:db8:8whie::/64                     |
   - 2001:db8:8whie::10                   [ 8WHIE CLI Engine ]
   - 2001:db8:8whie::11                   (8whie-proxy cli)
   - 2001:db8:8whie::12                            |
             |                            [ Configuration Store ]
             v                            (/etc/8whie-proxy/config.json)
   [ 8WHIE Proxy Supervisor ]                      |
             |                                     |
   +---------+------------------+                  |
   |                            |                  |
[ HTTP Proxy Instance ]    [ SOCKS5 Proxy Instance ]
Port: 18080                Port: 11080             |
Bind IP: 2001:db8:8whie::10  Bind IP: 2001:db8:8whie::11
Auth: Required             Auth: Required          |
   |                            |                  |
   +-------------+--------------+                  |
                 |                                 |
                 v                                 v
         [ Target Internet ]            [ Diagnostics & Logs ]
       (Egress from distinct IPv6)     (/var/log/8whie-proxy/)
```

---

## 📋 System Requirements

- **Operating System:** Linux (Ubuntu 20.04+, Debian 11+, Rocky Linux 9+, AlmaLinux, Arch, CentOS Stream)
- **Python Version:** Python 3.9 or newer
- **Kernel:** Linux Kernel 4.19+ with IPv6 networking enabled
- **Privileges:** `root` or `sudo` access (required for binding privileged ports or querying network interfaces)

---

## 📦 Quick Installation

### One-Line Automated Installer

Run the hardened installation script:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/8whie/8whie-ipv6-proxy/main/scripts/install.sh)"
```

### Manual Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/8whie/8whie-ipv6-proxy.git /opt/8whie-ipv6-proxy
   cd /opt/8whie-ipv6-proxy
   ```

2. **Run setup script:**
   ```bash
   sudo ./scripts/install.sh
   ```

3. **Verify installation:**
   ```bash
   8whie-proxy --version
   8whie-proxy scan
   ```

---

## 🛠️ CLI Usage Guide

The manager provides an intuitive command-line interface under the binary `8whie-proxy`:

### 1. Scan Available IPv6 Addresses
```bash
8whie-proxy scan
```
Discovers all assigned global IPv6 addresses on host interfaces and highlights whether they are currently assigned to any proxy.

### 2. List Configured Proxies
```bash
8whie-proxy list
```
Displays an ASCII table showing Proxy ID, Type (HTTP/SOCKS5), Port, Bound IPv6, Authentication User, and Service Status.

### 3. Add a New Proxy
```bash
# Add an HTTP proxy bound to a specific IPv6 address
8whie-proxy add --type http --port 8080 --ipv6 2001:db8::10 --user proxyuser --password securepass

# Add a SOCKS5 proxy with auto-generated strong credentials
8whie-proxy add --type socks5 --port 1080 --ipv6 2001:db8::11 --auto-auth
```

### 4. Start, Stop, and Restart Proxies
```bash
# Control all proxies
8whie-proxy start all
8whie-proxy stop all
8whie-proxy restart all

# Control a specific proxy by ID
8whie-proxy start px-1080
8whie-proxy stop px-1080
```

### 5. Check Runtime Status
```bash
8whie-proxy status
```

### 6. Run Self-Diagnostics & Tests
```bash
8whie-proxy test
# Test a specific proxy endpoint
8whie-proxy test px-1080
```

### 7. View Live Logs
```bash
8whie-proxy logs --follow
```

---

## ⚙️ Configuration File Structure

The default configuration file resides in `/etc/8whie-proxy/config.json` (or `config.yaml`):

```json
{
  "version": "1.0.0",
  "log_level": "INFO",
  "log_file": "/var/log/8whie-proxy/manager.log",
  "proxies": [
    {
      "id": "px-8080",
      "type": "http",
      "port": 8080,
      "ipv6_address": "2001:db8::10",
      "username": "aryan_http",
      "password_hash": "$2b$12$e...",
      "enabled": true,
      "max_connections": 500,
      "timeout_seconds": 60
    },
    {
      "id": "px-1080",
      "type": "socks5",
      "port": 1080,
      "ipv6_address": "2001:db8::11",
      "username": "aryan_socks",
      "password_hash": "$2b$12$f...",
      "enabled": true,
      "max_connections": 500,
      "timeout_seconds": 60
    }
  ]
}
```

---

## 🔒 Security Model

1. **Authentication by Default:** Every created endpoint mandates RFC-compliant credential negotiation. Anonymous access is strictly rejected.
2. **Timing Attack Protection:** Credential verification leverages Python's `secrets.compare_digest` constant-time comparator.
3. **No Password Exposure:** Passwords are never saved in cleartext inside system logs or status outputs.
4. **Least Privilege Systemd:** The systemd unit uses Linux isolation mechanisms (`ProtectSystem=strict`, `ProtectHome=true`, `PrivateTmp=true`, `NoNewPrivileges=true`).
5. **Strict Input Sanitization:** Addresses are parsed through Python's standard `ipaddress.IPv6Address` parser to block shell injections and malformed inputs.

---

## 🐳 Docker Deployment

To run containerized with full IPv6 support:

```bash
cd docker
docker compose up -d
```

Verify your host's Docker daemon has IPv6 enabled in `/etc/docker/daemon.json`:
```json
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64"
}
```

---

## 🧪 Automated Testing

Run the included standalone test suite without making external network calls:

```bash
pytest tests/ -v
```

Tests cover:
- Network interface parsing and IPv6 address filtering
- Port uniqueness and validation
- HTTP Basic Authentication header parsing
- SOCKS5 binary protocol greeting and negotiation
- Configuration serialization and safety checks

---

## 📄 License & Attribution

```
Copyright (c) 2026 Aryan Thakur (8WHIE).
Licensed under the Apache License, Version 2.0 (the "License").
```
Developed from scratch by **Aryan Thakur** under the **8WHIE** brand.
