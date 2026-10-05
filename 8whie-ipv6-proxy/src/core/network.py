"""
Network interface inspection and IPv6 discovery for 8WHIE IPv6 Proxy Manager.
Author: Aryan Thakur (8WHIE)
"""

import ipaddress
import os
import re
import socket
import subprocess
from typing import List, Optional, Tuple, Set
from .models import DiscoveredAddress


class IPv6NetworkDiscovery:
    """
    Discovers, validates, and tests IPv6 addresses assigned to the Linux host.
    Developed by Aryan Thakur under the 8WHIE brand.
    """

    # RFC 4291 / RFC 3849 reserved scopes to discard
    DISALLOWED_NETWORKS = [
        ipaddress.IPv6Network("::1/128"),        # Loopback
        ipaddress.IPv6Network("fe80::/10"),      # Link-local unicast
        ipaddress.IPv6Network("ff00::/8"),       # Multicast
        ipaddress.IPv6Network("::/128"),         # Unspecified
        ipaddress.IPv6Network("::ffff:0:0/96"),  # IPv4-mapped
        ipaddress.IPv6Network("100::/64"),       # Discard-only prefix (RFC 6666)
    ]

    @classmethod
    def is_global_routable(cls, ip_str: str) -> Tuple[bool, str]:
        """
        Validates if an IPv6 string is globally routable and valid for proxy egress.
        """
        try:
            addr = ipaddress.IPv6Address(ip_str.strip())
        except (ipaddress.AddressValueError, ValueError) as err:
            return False, f"Malformed IPv6 address: {err}"

        for network in cls.DISALLOWED_NETWORKS:
            if addr in network:
                return False, f"Address belongs to restricted/non-global range {network}"

        if addr.is_link_local:
            return False, "Link-local address (fe80::/10) not routable for proxy egress"
        if addr.is_loopback:
            return False, "Loopback address (::1) cannot be used as outbound proxy IP"
        if addr.is_multicast:
            return False, "Multicast address cannot be bound as unicast proxy endpoint"

        return True, "Valid globally routable IPv6"

    @classmethod
    def parse_proc_net_if_inet6(cls) -> List[DiscoveredAddress]:
        """
        Parses Linux /proc/net/if_inet6 directly without external tool dependency.
        Format in /proc/net/if_inet6:
        32-hex-chars prefix_len scope_id flags interface_name
        """
        results: List[DiscoveredAddress] = []
        path = "/proc/net/if_inet6"

        if not os.path.exists(path):
            return results

        try:
            with open(path, "r", encoding="ascii") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) < 6:
                        continue
                    raw_hex, _, prefix_len_hex, scope_hex, _, if_name = parts[:6]

                    # Group 32 hex chars into 8 groups of 4
                    chunks = [raw_hex[i:i+4] for i in range(0, 32, 4)]
                    expanded_ip = ":".join(chunks)

                    try:
                        addr = ipaddress.IPv6Address(expanded_ip)
                        compressed_ip = str(addr)
                        prefix_len = int(prefix_len_hex, 16)
                        scope_code = int(scope_hex, 16)

                        scope_name = "global"
                        if scope_code == 0x20:
                            scope_name = "link"
                        elif scope_code == 0x40:
                            scope_name = "site"
                        elif scope_code == 0x80:
                            scope_name = "host"

                        is_global, reason = cls.is_global_routable(compressed_ip)

                        # Only collect global unicast addresses
                        if is_global:
                            results.append(DiscoveredAddress(
                                interface=if_name,
                                address=compressed_ip,
                                prefix_len=prefix_len,
                                scope=scope_name,
                                is_global=True,
                                details=reason
                            ))
                    except Exception:
                        continue
        except (IOError, PermissionError):
            pass

        return results

    @classmethod
    def parse_ip_command(cls) -> List[DiscoveredAddress]:
        """
        Fallback parser invoking 'ip -6 addr show' on Linux hosts.
        """
        results: List[DiscoveredAddress] = []
        try:
            proc = subprocess.run(
                ["ip", "-6", "addr", "show", "scope", "global"],
                capture_output=True,
                text=True,
                timeout=3,
                check=False
            )
            if proc.returncode != 0:
                return results

            current_iface = "unknown"
            for line in proc.stdout.splitlines():
                line = line.strip()
                # Check interface header: e.g., '2: eth0: <BROADCAST,...>'
                if_match = re.match(r"^\d+:\s+([a-zA-Z0-9_\-\.]+):", line)
                if if_match:
                    current_iface = if_match.group(1)
                    continue

                # Check inet6 entry: 'inet6 2001:db8::10/64 scope global'
                if line.startswith("inet6 "):
                    tokens = line.split()
                    if len(tokens) >= 2:
                        cidr = tokens[1]
                        if "/" in cidr:
                            ip_part, plen_part = cidr.split("/", 1)
                            plen = int(plen_part)
                        else:
                            ip_part = cidr
                            plen = 128

                        is_global, reason = cls.is_global_routable(ip_part)
                        if is_global:
                            results.append(DiscoveredAddress(
                                interface=current_iface,
                                address=ip_part,
                                prefix_len=plen,
                                scope="global",
                                is_global=True,
                                details=reason
                            ))
        except (subprocess.SubprocessError, FileNotFoundError, PermissionError):
            pass

        return results

    @classmethod
    def discover_addresses(cls) -> List[DiscoveredAddress]:
        """
        Primary entry point for discovering assigned global IPv6 addresses.
        Merges results from /proc/net/if_inet6 and ip CLI, deduplicating records.
        """
        seen: Set[str] = set()
        merged: List[DiscoveredAddress] = []

        # 1. Try /proc/net/if_inet6 first (lightweight, native)
        proc_addrs = cls.parse_proc_net_if_inet6()
        for item in proc_addrs:
            if item.address not in seen:
                seen.add(item.address)
                merged.append(item)

        # 2. Try 'ip' tool fallback if empty
        if not merged:
            ip_addrs = cls.parse_ip_command()
            for item in ip_addrs:
                if item.address not in seen:
                    seen.add(item.address)
                    merged.append(item)

        return merged

    @classmethod
    def can_bind_ipv6(cls, ip_str: str, test_port: int = 0) -> Tuple[bool, str]:
        """
        Tests if the current system process can bind to this specific IPv6 address.
        """
        try:
            with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                # On Linux, IP_FREEBIND (15) allows binding to an address before it is explicitly assigned
                try:
                    s.bind((ip_str, test_port))
                    return True, "Bind successful: host possesses or permits this IPv6 address"
                except OSError as e:
                    return False, f"OS Socket bind failed on [{ip_str}]: {e.strerror or e}"
        except Exception as e:
            return False, f"System socket error: {e}"

    @classmethod
    def is_port_in_use(cls, port: int, host: str = "::") -> bool:
        """
        Checks if a TCP port is already actively bound or in use.
        """
        try:
            with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind((host, port))
                return False
        except OSError:
            return True
