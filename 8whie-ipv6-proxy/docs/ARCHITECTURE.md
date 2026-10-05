# 8WHIE IPv6 Proxy Manager - Architecture Specification

**Brand:** 8WHIE  
**Developer:** Aryan Thakur  
**Document Version:** 1.0.0

---

## 1. Executive Summary

**8WHIE IPv6 Proxy Manager** is an asynchronous, self-hosted multi-proxy management system engineered for Linux servers provisioned with one or more IPv6 allocations (/64, /56, or /48 subnets).

Each client connecting to a managed proxy port is authenticated and routed out through an explicitly assigned IPv6 address on the server's network stack.

---

## 2. Component Diagram

```
+-------------------------------------------------------------------------+
|                        8WHIE IPv6 Proxy Manager                         |
+-------------------------------------------------------------------------+
                                    |
      +-----------------------------+-----------------------------+
      |                                                           |
      v                                                           v
[ CLI Interface ]                                         [ Core Supervisor ]
  (click/rich)                                              (manager.py)
      |                                                           |
      +----------> [ IPv6 Discovery Engine ] <--------------------+
      |            (/proc/net/if_inet6 & ip CLI)                  |
      |                                                           |
      +----------> [ Configuration & Secrets ] <------------------+
      |            (JSON/YAML 0600 storage)                       |
      |                                                           |
      +----------> [ Diagnostic Self-Tester ]                     |
                   (local loopback handshake)                     |
                                                                  v
                                              +-------------------+-------------------+
                                              |                                       |
                                              v                                       v
                                    [ HTTP Proxy Server ]                   [ SOCKS5 Proxy Server ]
                                    - CONNECT tunneling                     - RFC 1928 / 1929 Auth
                                    - Forward proxy                         - Binary negotiation
                                    - IPv6 Egress Socket                    - IPv6 Egress Socket
                                              |                                       |
                                              +-------------------+-------------------+
                                                                  |
                                                                  v
                                                     [ Linux Kernel TCP Stack ]
                                                       Egress on Bound IPv6
                                                     (2001:db8::10, 2001:db8::11)
```

---

## 3. Technology Choices

| Domain | Technology Chosen | Architectural Justification |
| :--- | :--- | :--- |
| **Language** | Python 3.9+ | Standard across all modern enterprise Linux distributions (Ubuntu, Debian, RHEL, Rocky, Arch). |
| **I/O Engine** | Python `asyncio` | Event-loop architecture provides lightweight non-blocking concurrency capable of serving thousands of simultaneous proxy tunnels with minimal RAM footprint. |
| **Network Discovery** | Linux `/proc/net/if_inet6` | Zero-subprocess direct kernel filesystem parser. Ultra-fast, reliable, and does not depend on binary locations like `/sbin/ip`. |
| **CLI Framework** | `click` + `rich` | Predictable argument parsing, subcommands, formatted terminal tables, and beginner-friendly help screens. |
| **Cryptography** | `bcrypt` + `secrets.compare_digest` | Salted credential hashing resilient to brute force; constant-time comparison prevents side-channel timing attacks. |
| **Service Supervisor**| Systemd | Native Linux process lifecycle supervisor, cgroups resource control, journald log aggregation, and kernel sandboxing. |

---

## 4. Egress IPv6 Socket Binding Mechanics

In Linux, when an application connects to a remote server without calling `bind()`, the kernel selects the default outbound interface and default primary IP via the routing table (`ip -6 route`).

To guarantee that each proxy uses its designated IPv6 identity, the 8WHIE proxy engine creates a non-blocking TCP socket and explicitly executes:

```python
sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind((designated_ipv6_address, 0))  # 0 allows OS to pick ephemeral source port
```

This enforces that all outbound TCP packets carry the selected source IPv6 address in their IP header.

---

## 5. Security & Isolation Model

1. **System Isolation:** When installed via systemd, the daemon runs under an unprivileged `whieproxy` system user with `NoNewPrivileges=true` and `ProtectSystem=strict`.
2. **File Permissions:** Configuration files containing hashed credentials (`config.json`) are automatically restricted to POSIX mode `0600`.
3. **No Credential Echo:** Passwords entered on the CLI or generated dynamically are hashed immediately; plain passwords never touch log files.
4. **Input Sanitization:** IPv6 addresses and listening ports are parsed and validated through `ipaddress.IPv6Address` and strict integer ranges before accepting configuration modifications.
