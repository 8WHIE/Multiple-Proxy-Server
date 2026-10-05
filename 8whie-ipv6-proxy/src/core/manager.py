"""
Proxy Lifecycle Manager & Configuration Supervisor for 8WHIE IPv6 Proxy Manager.
Author: Aryan Thakur (8WHIE)
Brand: 8WHIE
"""

import asyncio
import json
import logging
import os
import signal
import sys
from typing import Dict, List, Optional, Tuple, Any

from .models import ProxyEndpoint, ProxyType, ProxyStatus, SystemConfig
from .network import IPv6NetworkDiscovery
from .security import SecurityEngine
from ..servers.http_proxy import IPv6HttpProxyServer
from ..servers.socks5_proxy import IPv6Socks5ProxyServer

logger = logging.getLogger("8whie.manager")


class ProxySupervisor:
    """
    Supervises active proxy instances, validates configurations, manages persistence,
    and coordinates process lifecycle.
    """

    DEFAULT_CONFIG_PATH = os.environ.get("WHIE_CONFIG_PATH", "/etc/8whie-proxy/config.json")
    FALLBACK_CONFIG_PATH = os.path.expanduser("~/.config/8whie-proxy/config.json")

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or self._resolve_config_path()
        self.config = SystemConfig()
        self.running_servers: Dict[str, Any] = {}
        self.running_tasks: Dict[str, asyncio.Task] = {}
        self._load_config()

    def _resolve_config_path(self) -> str:
        if os.path.exists(self.DEFAULT_CONFIG_PATH):
            return self.DEFAULT_CONFIG_PATH
        if os.path.exists(self.FALLBACK_CONFIG_PATH):
            return self.FALLBACK_CONFIG_PATH
        # Check local config directory
        local_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config", "proxy_config.json")
        if os.path.exists(local_path):
            return local_path
        # Default to local or user path if /etc is not writable
        if os.access("/etc", os.W_OK):
            return self.DEFAULT_CONFIG_PATH
        return self.FALLBACK_CONFIG_PATH

    def _load_config(self) -> None:
        if not os.path.exists(self.config_path):
            logger.debug(f"Configuration file {self.config_path} does not exist yet. Initializing empty config.")
            return

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            sys_data = data.get("system", {})
            self.config.log_level = sys_data.get("log_level", "INFO")
            self.config.log_file = sys_data.get("log_file", "/var/log/8whie-proxy/manager.log")
            self.config.listen_host = sys_data.get("listen_host", "::")

            self.config.proxies = []
            for p_dict in data.get("proxies", []):
                p_type = ProxyType.HTTP if p_dict.get("type", "http").lower() == "http" else ProxyType.SOCKS5
                endpoint = ProxyEndpoint(
                    id=p_dict["id"],
                    type=p_type,
                    port=int(p_dict["port"]),
                    ipv6_address=p_dict["ipv6_address"],
                    username=p_dict.get("username", "admin"),
                    password_hash=p_dict.get("password_hash", ""),
                    enabled=p_dict.get("enabled", True),
                    max_connections=p_dict.get("max_connections", 500),
                    timeout_seconds=p_dict.get("timeout_seconds", 60),
                    description=p_dict.get("description", ""),
                    status=ProxyStatus.STOPPED
                )
                self.config.proxies.append(endpoint)

        except Exception as e:
            logger.error(f"Failed to parse configuration at {self.config_path}: {e}")

    def save_config(self) -> None:
        """
        Saves current configuration to disk with strict permission protections (0600).
        """
        dir_name = os.path.dirname(self.config_path)
        if dir_name and not os.path.exists(dir_name):
            try:
                os.makedirs(dir_name, mode=0o700, exist_ok=True)
            except OSError as e:
                logger.error(f"Cannot create configuration directory {dir_name}: {e}")
                return

        payload = {
            "system": {
                "name": self.config.name,
                "developer": self.config.developer,
                "version": self.config.version,
                "log_level": self.config.log_level,
                "log_file": self.config.log_file,
                "pid_file": self.config.pid_file,
                "listen_host": self.config.listen_host,
            },
            "proxies": [
                {
                    "id": p.id,
                    "type": p.type.value if isinstance(p.type, ProxyType) else p.type,
                    "port": p.port,
                    "ipv6_address": p.ipv6_address,
                    "username": p.username,
                    "password_hash": p.password_hash,
                    "enabled": p.enabled,
                    "max_connections": p.max_connections,
                    "timeout_seconds": p.timeout_seconds,
                    "description": p.description,
                }
                for p in self.config.proxies
            ]
        }

        try:
            temp_path = f"{self.config_path}.tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
            SecurityEngine.enforce_secure_file_permissions(temp_path)
            os.replace(temp_path, self.config_path)
            SecurityEngine.enforce_secure_file_permissions(self.config_path)
            logger.info(f"Saved 8WHIE configuration securely to {self.config_path}")
        except Exception as e:
            logger.error(f"Failed saving configuration to {self.config_path}: {e}")
            raise

    def get_proxy(self, proxy_id: str) -> Optional[ProxyEndpoint]:
        for p in self.config.proxies:
            if p.id == proxy_id:
                return p
        return None

    def add_proxy(
        self,
        proxy_type: str,
        port: int,
        ipv6_address: str,
        username: str,
        password: str,
        proxy_id: Optional[str] = None,
        description: str = "",
        validate_live_bind: bool = False
    ) -> Tuple[bool, str, Optional[ProxyEndpoint]]:
        """
        Validates, registers, and persists a new proxy endpoint.
        """
        # Validate type
        norm_type = proxy_type.lower()
        if norm_type not in ["http", "socks5"]:
            return False, "Proxy type must be 'http' or 'socks5'", None

        p_type = ProxyType.HTTP if norm_type == "http" else ProxyType.SOCKS5

        # Check port uniqueness across existing configured proxies
        for existing in self.config.proxies:
            if existing.port == port:
                return False, f"Port {port} is already configured for proxy '{existing.id}'", None

        # Check if port is already bound on host
        if IPv6NetworkDiscovery.is_port_in_use(port):
            return False, f"Port {port} is currently actively listening on host interface", None

        # Validate IPv6 address
        is_global, reason = IPv6NetworkDiscovery.is_global_routable(ipv6_address)
        if not is_global:
            return False, f"IPv6 address verification failed: {reason}", None

        # Optional live socket bind test
        if validate_live_bind:
            can_bind, bind_reason = IPv6NetworkDiscovery.can_bind_ipv6(ipv6_address)
            if not can_bind:
                return False, f"Cannot bind to IPv6 on this system: {bind_reason}", None

        # Credentials
        if not username or len(username.strip()) < 2:
            return False, "Username must contain at least 2 characters", None

        if not password or len(password) < 6:
            return False, "Password must contain at least 6 characters", None

        password_hash = SecurityEngine.hash_password(password)

        new_id = proxy_id or f"px-{norm_type}-{port}"
        # Ensure unique ID
        if any(p.id == new_id for p in self.config.proxies):
            new_id = f"px-{norm_type}-{port}-{os.urandom(2).hex()}"

        endpoint = ProxyEndpoint(
            id=new_id,
            type=p_type,
            port=port,
            ipv6_address=ipv6_address,
            username=username,
            password_hash=password_hash,
            enabled=True,
            description=description,
            status=ProxyStatus.STOPPED
        )

        try:
            endpoint.validate()
        except ValueError as e:
            return False, str(e), None

        self.config.proxies.append(endpoint)
        self.save_config()
        return True, f"Successfully created proxy '{endpoint.id}'", endpoint

    def remove_proxy(self, proxy_id: str) -> Tuple[bool, str]:
        """
        Stops and deletes a proxy endpoint from configuration.
        """
        endpoint = self.get_proxy(proxy_id)
        if not endpoint:
            return False, f"Proxy '{proxy_id}' not found"

        if endpoint.id in self.running_servers:
            # Must be stopped first
            asyncio.create_task(self.stop_proxy(proxy_id))

        self.config.proxies = [p for p in self.config.proxies if p.id != proxy_id]
        self.save_config()
        return True, f"Proxy '{proxy_id}' removed successfully"

    async def start_proxy(self, proxy_id: str) -> Tuple[bool, str]:
        """
        Spawns an asynchronous server instance for the given proxy.
        """
        endpoint = self.get_proxy(proxy_id)
        if not endpoint:
            return False, f"Proxy '{proxy_id}' not found"

        if proxy_id in self.running_servers and self.running_servers[proxy_id].is_running:
            return True, f"Proxy '{proxy_id}' is already running"

        try:
            if endpoint.type == ProxyType.HTTP:
                server = IPv6HttpProxyServer(
                    proxy_id=endpoint.id,
                    listen_host=self.config.listen_host,
                    listen_port=endpoint.port,
                    outbound_ipv6=endpoint.ipv6_address,
                    username=endpoint.username,
                    password_hash=endpoint.password_hash,
                    timeout=endpoint.timeout_seconds
                )
            else:
                server = IPv6Socks5ProxyServer(
                    proxy_id=endpoint.id,
                    listen_host=self.config.listen_host,
                    listen_port=endpoint.port,
                    outbound_ipv6=endpoint.ipv6_address,
                    username=endpoint.username,
                    password_hash=endpoint.password_hash,
                    timeout=endpoint.timeout_seconds
                )

            await server.start()
            self.running_servers[proxy_id] = server
            endpoint.status = ProxyStatus.RUNNING
            endpoint.pid = os.getpid()
            return True, f"Proxy '{proxy_id}' started on port {endpoint.port}"
        except Exception as e:
            endpoint.status = ProxyStatus.ERROR
            logger.error(f"Failed to start proxy '{proxy_id}': {e}")
            return False, f"Failed to start proxy '{proxy_id}': {e}"

    async def stop_proxy(self, proxy_id: str) -> Tuple[bool, str]:
        """
        Shuts down a running proxy instance.
        """
        endpoint = self.get_proxy(proxy_id)
        server = self.running_servers.get(proxy_id)

        if server:
            await server.stop()
            del self.running_servers[proxy_id]

        if endpoint:
            endpoint.status = ProxyStatus.STOPPED
            endpoint.pid = None

        return True, f"Proxy '{proxy_id}' stopped"

    async def restart_proxy(self, proxy_id: str) -> Tuple[bool, str]:
        await self.stop_proxy(proxy_id)
        await asyncio.sleep(0.5)
        return await self.start_proxy(proxy_id)

    async def start_all(self) -> Dict[str, Tuple[bool, str]]:
        results = {}
        for p in self.config.proxies:
            if p.enabled:
                results[p.id] = await self.start_proxy(p.id)
        return results

    async def stop_all(self) -> Dict[str, Tuple[bool, str]]:
        results = {}
        for pid in list(self.running_servers.keys()):
            results[pid] = await self.stop_proxy(pid)
        return results
