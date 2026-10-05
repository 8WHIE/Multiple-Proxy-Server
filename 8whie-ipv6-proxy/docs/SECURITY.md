# 8WHIE IPv6 Proxy Manager - Security Model & Guidelines

**Brand:** 8WHIE  
**Developer:** Aryan Thakur  
**Document Version:** 1.0.0

---

## 1. Security Architecture Principles

Security is integral to the 8WHIE IPv6 Proxy Manager design:

- **Mandatory Authentication:** Anonymous open relays present critical abuse and legal risks. All 8WHIE proxies require strong RFC 1929 (SOCKS5) or HTTP Basic authentication by default.
- **Timing-Attack Resistance:** String comparisons during authentication employ constant-time cryptographic digests (`hmac.compare_digest` / `secrets.compare_digest`).
- **Least Privilege Execution:** The Linux systemd unit assigns the service to dedicated user `whieproxy` and limits Linux kernel capabilities to `CAP_NET_BIND_SERVICE`.
- **Credential Storage:** Stored configurations use salted hash digests (`bcrypt` or PBKDF2-HMAC-SHA256). Cleartext passwords are never persisted on disk.
- **Zero-Credential Logging:** Inbound HTTP `Proxy-Authorization` headers, credentials, and tokens are scrubbed before log recording.

---

## 2. Linux Kernel & Firewall Recommendations

### UFW (Uncomplicated Firewall) Setup

If your VPS runs UFW, permit inbound connections only on your chosen proxy ports:

```bash
# Allow proxy ports (e.g., 8080 and 1080)
sudo ufw allow 8080/tcp comment "8WHIE HTTP Proxy"
sudo ufw allow 1080/tcp comment "8WHIE SOCKS5 Proxy"
sudo ufw enable
```

### Restricting Access to Specific Client IPs

For optimal security, restrict access so only your workstation or client server can reach the proxy ports:

```bash
# Restrict port 8080 to a trusted client IP (e.g., 203.0.113.50 or 2001:db8:client::1)
sudo ufw allow from 203.0.113.50 to any port 8080 proto tcp
```

---

## 3. Vulnerability Reporting

If you identify a security concern or potential vulnerability in 8WHIE IPv6 Proxy Manager, please contact Aryan Thakur via security channels at `security@8whie.internal`.
