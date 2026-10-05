"""
Security & Credential test suite for 8WHIE IPv6 Proxy Manager.
Author: Aryan Thakur (8WHIE)
"""

import pytest
from src.core.security import SecurityEngine


class TestSecurityEngine:

    def test_generate_secure_password(self):
        pwd = SecurityEngine.generate_secure_password(24)
        assert len(pwd) == 24
        assert any(c.isupper() for c in pwd)
        assert any(c.islower() for c in pwd)
        assert any(c.isdigit() for c in pwd)
        assert any(c in "!@#$%^*()-_=+" for c in pwd)

    def test_password_hashing_and_verification(self):
        plain = "8WHIE_UltraSecret_Pass2026!"
        hashed = SecurityEngine.hash_password(plain)

        # Ensure plain text is not in hash
        assert plain not in hashed

        # Verify correct password
        assert SecurityEngine.verify_password(plain, hashed) is True

        # Verify wrong password fails
        assert SecurityEngine.verify_password("wrong_password", hashed) is False

    def test_mask_secret(self):
        assert SecurityEngine.mask_secret("aryan123456") == "ar*******56"
        assert SecurityEngine.mask_secret("abc") == "***"
