"""
Security, hashing, and credential generation for 8WHIE IPv6 Proxy Manager.
Author: Aryan Thakur (8WHIE)
"""

import hashlib
import hmac
import os
import secrets
import string
from typing import Tuple

try:
    import bcrypt  # type: ignore
    HAS_BCRYPT = True
except ImportError:
    HAS_BCRYPT = False


class SecurityEngine:
    """
    Handles cryptographic credential verification, random key generation,
    and safe string redactions for 8WHIE IPv6 Proxy Manager.
    """

    @staticmethod
    def generate_secure_password(length: int = 18) -> str:
        """
        Generates a cryptographically strong, high-entropy password.
        Uses secrets.choice across upper, lower, digits, and safe symbols.
        """
        if length < 12:
            length = 12
        alphabet = string.ascii_letters + string.digits + "!@#$%^*()-_=+"
        while True:
            pwd = "".join(secrets.choice(alphabet) for _ in range(length))
            if (any(c.islower() for c in pwd)
                    and any(c.isupper() for c in pwd)
                    and any(c.isdigit() for c in pwd)
                    and any(c in "!@#$%^*()-_=+" for c in pwd)):
                return pwd

    @classmethod
    def hash_password(cls, plain_password: str) -> str:
        """
        Hashes a plaintext password using bcrypt with salt rounds,
        or PBKDF2-HMAC-SHA256 if bcrypt library is not installed.
        """
        if HAS_BCRYPT:
            salt = bcrypt.gensalt(rounds=12)
            hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
            return hashed.decode("utf-8")
        else:
            salt = secrets.token_bytes(16)
            key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100_000)
            return f"pbkdf2_sha256${salt.hex()}${key.hex()}"

    @classmethod
    def verify_password(cls, plain_password: str, hashed_or_encoded: str) -> bool:
        """
        Verifies plaintext credentials against the stored hash in constant time
        to prevent timing attacks.
        """
        if not hashed_or_encoded or not plain_password:
            return False

        try:
            if hashed_or_encoded.startswith("$2b$") or hashed_or_encoded.startswith("$2a$"):
                if HAS_BCRYPT:
                    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_or_encoded.encode("utf-8"))
                # If bcrypt is not present, we cannot verify bcrypt hashes safely
                return False

            if hashed_or_encoded.startswith("pbkdf2_sha256$"):
                parts = hashed_or_encoded.split("$")
                if len(parts) == 3:
                    salt = bytes.fromhex(parts[1])
                    expected_key = bytes.fromhex(parts[2])
                    computed_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100_000)
                    return hmac.compare_digest(computed_key, expected_key)

            # Constant-time comparison fallback for plain tokens during tests
            return hmac.compare_digest(plain_password, hashed_or_encoded)
        except Exception:
            return False

    @staticmethod
    def mask_secret(text: str) -> str:
        """
        Masks a secret string for safe display.
        """
        if not text:
            return "******"
        if len(text) <= 4:
            return "*" * len(text)
        return text[:2] + ("*" * (len(text) - 4)) + text[-2:]

    @staticmethod
    def enforce_secure_file_permissions(filepath: str) -> None:
        """
        Ensures configuration and credential files have strictly restricted
        permissions (0600: read/write only by owner).
        """
        if os.path.exists(filepath):
            try:
                os.chmod(filepath, 0o600)
            except OSError:
                pass
