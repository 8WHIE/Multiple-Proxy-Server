"""
Server protocol & authentication parsing test suite for 8WHIE IPv6 Proxy Manager.
Author: Aryan Thakur (8WHIE)
"""

import base64
import pytest
from src.servers.http_proxy import IPv6HttpProxyServer
from src.core.security import SecurityEngine


class TestServerProtocols:

    def test_http_proxy_auth_header_validation(self):
        plain_user = "aryan_operator"
        plain_pass = "AryanPass123$"
        pwd_hash = SecurityEngine.hash_password(plain_pass)

        server = IPv6HttpProxyServer(
            proxy_id="test-http",
            listen_host="::",
            listen_port=8080,
            outbound_ipv6="2001:db8::10",
            username=plain_user,
            password_hash=pwd_hash
        )

        # 1. Missing header
        assert server._verify_auth(None) is False

        # 2. Correct header
        valid_creds = base64.b64encode(f"{plain_user}:{plain_pass}".encode("utf-8")).decode("ascii")
        valid_header = f"Basic {valid_creds}"
        assert server._verify_auth(valid_header) is True

        # 3. Wrong password
        wrong_creds = base64.b64encode(f"{plain_user}:badpass".encode("utf-8")).decode("ascii")
        wrong_header = f"Basic {wrong_creds}"
        assert server._verify_auth(wrong_header) is False

        # 4. Wrong username
        wrong_user_creds = base64.b64encode(f"intruder:{plain_pass}".encode("utf-8")).decode("ascii")
        wrong_user_header = f"Basic {wrong_user_creds}"
        assert server._verify_auth(wrong_user_header) is False
