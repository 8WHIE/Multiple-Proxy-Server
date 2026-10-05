# 8WHIE IPv6 Proxy Manager - Troubleshooting Guide

**Brand:** 8WHIE  
**Developer:** Aryan Thakur  

---

## Common Issues and Solutions

### 1. `8whie-proxy scan` reports "No global IPv6 addresses detected"

**Possible Causes:**
- The VPS provider has not enabled or provisioned IPv6 on your network interface.
- IPv6 is disabled in the Linux kernel configuration (`sysctl`).

**Resolution:**
1. Check interface status:
   ```bash
   ip -6 addr show
   ```
2. Verify sysctl kernel parameters:
   ```bash
   sudo sysctl net.ipv6.conf.all.disable_ipv6
   ```
   If it returns `1`, enable IPv6:
   ```bash
   sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
   sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0
   ```
3. Test manual ping:
   ```bash
   ping6 -c 3 2600::
   ```

---

### 2. Error: "Cannot assign requested address" on proxy start

**Possible Cause:**
- You specified an IPv6 address in `8whie-proxy add` that is not bound to a local network interface on this machine.

**Resolution:**
1. Run `8whie-proxy scan` to confirm the list of assigned IPv6 addresses.
2. If your hosting provider assigned a `/64` subnet and you want to use multiple IPs from that subnet, bind the address to your interface:
   ```bash
   sudo ip -6 addr add 2001:db8::10/64 dev eth0
   ```
   Then retry starting the proxy.

---

### 3. Port Conflict / Address in Use

**Possible Cause:**
- Another daemon (or an existing instance of 8whie-proxy) is occupying the requested TCP port.

**Resolution:**
1. Identify what process owns the port:
   ```bash
   sudo ss -tulpn | grep :8080
   ```
2. Stop the conflicting service or choose an unused port with `8whie-proxy add --port <new_port>`.

---

### 4. Client receives `407 Proxy Authentication Required`

**Possible Cause:**
- The client application is sending invalid credentials or omitted the `Proxy-Authorization` header.

**Resolution:**
- For `curl`:
  ```bash
  curl -x http://username:password@your-server-ip:8080 -L http://example.com
  ```
- For SOCKS5:
  ```bash
  curl --socks5-hostname username:password@your-server-ip:1080 http://example.com
  ```
