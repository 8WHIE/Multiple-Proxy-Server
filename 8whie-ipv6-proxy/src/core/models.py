"""
Data models and typed structures for 8WHIE IPv6 Proxy Manager.
Author: Aryan Thakur (8WHIE)
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional, List, Dict, Any
import ipaddress
import time


class ProxyType(str, Enum):
    HTTP = "http"
    SOCKS5 = "socks5"


class ProxyStatus(str, Enum):
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"
    PORT_CONFLICT = "port_conflict"


@dataclass
class DiscoveredAddress:
    interface: str
    address: str
    prefix_len: int
    scope: str
    is_global: bool
    is_assigned_to_proxy: bool = False
    details: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ProxyEndpoint:
    id: str
    type: ProxyType
    port: int
    ipv6_address: str
    username: str
    password_hash: str
    enabled: bool = True
    max_connections: int = 500
    timeout_seconds: int = 60
    description: str = ""
    status: ProxyStatus = ProxyStatus.STOPPED
    pid: Optional[int] = None
    created_at: float = field(default_factory=time.time)
    last_checked_at: Optional[float] = None
    bytes_in: int = 0
    bytes_out: int = 0
    active_connections: int = 0

    def to_dict(self, redact_secrets: bool = True) -> Dict[str, Any]:
        data = asdict(self)
        data["type"] = self.type.value if isinstance(self.type, ProxyType) else self.type
        data["status"] = self.status.value if isinstance(self.status, ProxyStatus) else self.status
        if redact_secrets:
            data["password_hash"] = "[PROTECTED]"
        return data

    def validate(self) -> None:
        if not (1 <= self.port <= 65535):
            raise ValueError(f"Port {self.port} must be between 1 and 65535.")
        try:
            addr = ipaddress.IPv6Address(self.ipv6_address)
            if addr.is_loopback:
                raise ValueError("IPv6 address cannot be loopback (::1).")
            if addr.is_link_local:
                raise ValueError("IPv6 address cannot be link-local (fe80::/10).")
            if addr.is_multicast:
                raise ValueError("IPv6 address cannot be multicast.")
        except ipaddress.AddressValueError as err:
            raise ValueError(f"Invalid IPv6 address '{self.ipv6_address}': {err}")

        if not self.username or len(self.username.strip()) < 2:
            raise ValueError("Username must be at least 2 characters long.")


@dataclass
class SystemConfig:
    name: str = "8WHIE IPv6 Proxy Manager"
    developer: str = "Aryan Thakur"
    version: str = "1.0.0"
    log_level: str = "INFO"
    log_file: str = "/var/log/8whie-proxy/manager.log"
    pid_file: str = "/run/8whie-proxy/manager.pid"
    listen_host: str = "::"
    proxies: List[ProxyEndpoint] = field(default_factory=list)

    def to_dict(self, redact_secrets: bool = True) -> Dict[str, Any]:
        return {
            "system": {
                "name": self.name,
                "developer": self.developer,
                "version": self.version,
                "log_level": self.log_level,
                "log_file": self.log_file,
                "pid_file": self.pid_file,
                "listen_host": self.listen_host,
            },
            "proxies": [p.to_dict(redact_secrets=redact_secrets) for p in self.proxies],
        }


@dataclass
class TestResult:
    proxy_id: str
    proxy_type: str
    port: int
    target_ipv6: str
    is_running: bool
    port_listening: bool
    auth_verified: bool
    outbound_bind_verified: bool
    latency_ms: float
    error_message: Optional[str] = None
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
