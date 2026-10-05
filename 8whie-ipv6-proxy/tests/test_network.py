"""
Network and IPv6 validation test suite for 8WHIE IPv6 Proxy Manager.
Author: Aryan Thakur (8WHIE)
"""

import pytest
from src.core.network import IPv6NetworkDiscovery


class TestIPv6NetworkDiscovery:

    def test_valid_global_ipv6(self):
        valid_ips = [
            "2001:db8:8whie::1",
            "2600:1900:4000::1",
            "2400:cb00:2048:1::c629:d7a2",
            "2a01:4f8:c010:d::2",
        ]
        for ip in valid_ips:
            # Note: 2001:db8 is documentation prefix, but syntactically valid global unicast
            is_global, _ = IPv6NetworkDiscovery.is_global_routable(ip)
            assert is_global is True, f"Expected {ip} to be accepted as global unicast"

    def test_reject_loopback_and_link_local(self):
        invalid_ips = [
            ("::1", "Loopback"),
            ("fe80::1", "Link-local"),
            ("fe80::1ff:fe23:4567", "Link-local"),
            ("ff02::1", "Multicast"),
            ("::", "Unspecified"),
        ]
        for ip, label in invalid_ips:
            is_global, reason = IPv6NetworkDiscovery.is_global_routable(ip)
            assert is_global is False, f"Expected {label} ({ip}) to be rejected"
            assert len(reason) > 0

    def test_reject_malformed_ips(self):
        malformed = [
            "not-an-ip",
            "192.168.1.1",  # IPv4 should not pass IPv6 egress check
            "2001:xyz::1",
            "2001:db8:::1",
            "",
        ]
        for item in malformed:
            is_global, _ = IPv6NetworkDiscovery.is_global_routable(item)
            assert is_global is False
