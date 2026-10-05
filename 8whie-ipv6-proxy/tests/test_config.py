"""
Configuration & Model validation test suite for 8WHIE IPv6 Proxy Manager.
Author: Aryan Thakur (8WHIE)
"""

import pytest
from src.core.models import ProxyEndpoint, ProxyType, ProxyStatus, SystemConfig


class TestConfigurationModels:

    def test_valid_proxy_endpoint(self):
        endpoint = ProxyEndpoint(
            id="px-test-1",
            type=ProxyType.HTTP,
            port=8080,
            ipv6_address="2001:db8::10",
            username="aryan_test",
            password_hash="mock_hash"
        )
        # Should not raise exception
        endpoint.validate()
        assert endpoint.port == 8080
        assert endpoint.type == ProxyType.HTTP

    def test_reject_invalid_port_range(self):
        with pytest.raises(ValueError, match="Port"):
            endpoint = ProxyEndpoint(
                id="px-invalid-port",
                type=ProxyType.SOCKS5,
                port=70000,
                ipv6_address="2001:db8::10",
                username="aryan_test",
                password_hash="mock_hash"
            )
            endpoint.validate()

    def test_reject_loopback_in_proxy_endpoint(self):
        with pytest.raises(ValueError, match="loopback"):
            endpoint = ProxyEndpoint(
                id="px-loopback",
                type=ProxyType.HTTP,
                port=8080,
                ipv6_address="::1",
                username="aryan_test",
                password_hash="mock_hash"
            )
            endpoint.validate()

    def test_redact_secrets_on_export(self):
        endpoint = ProxyEndpoint(
            id="px-secret",
            type=ProxyType.HTTP,
            port=9090,
            ipv6_address="2001:db8::10",
            username="user_secret",
            password_hash="super_secret_hash_value"
        )
        exported = endpoint.to_dict(redact_secrets=True)
        assert exported["password_hash"] == "[PROTECTED]"
        assert "super_secret_hash_value" not in str(exported)
