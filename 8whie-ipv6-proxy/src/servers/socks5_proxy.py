"""
Asynchronous SOCKS5 Proxy Server with RFC 1928 / RFC 1929 Authentication & IPv6 Egress Binding.
Author: Aryan Thakur (8WHIE)
Brand: 8WHIE
"""

import asyncio
import logging
import socket
import struct
from typing import Optional, Tuple
from ..core.security import SecurityEngine

logger = logging.getLogger("8whie.proxy.socks5")

# SOCKS5 Constants
SOCKS_VERSION = 0x05
AUTH_METHOD_NO_AUTH = 0x00
AUTH_METHOD_USER_PASS = 0x02
AUTH_METHOD_NO_ACCEPTABLE = 0xFF

CMD_CONNECT = 0x01
CMD_BIND = 0x02
CMD_UDP_ASSOCIATE = 0x03

ATYP_IPV4 = 0x01
ATYP_DOMAIN = 0x03
ATYP_IPV6 = 0x04

REP_SUCCESS = 0x00
REP_GEN_FAILURE = 0x01
REP_NOT_ALLOWED = 0x02
REP_NET_UNREACHABLE = 0x03
REP_HOST_UNREACHABLE = 0x04
REP_CONN_REFUSED = 0x05
REP_CMD_NOT_SUPPORTED = 0x07
REP_ATYP_NOT_SUPPORTED = 0x08


class IPv6Socks5ProxyServer:
    """
    Original RFC 1928 / RFC 1929 compliant SOCKS5 server with outbound IPv6 address binding.
    """

    def __init__(
        self,
        proxy_id: str,
        listen_host: str,
        listen_port: int,
        outbound_ipv6: str,
        username: str,
        password_hash: str,
        timeout: int = 60,
    ):
        self.proxy_id = proxy_id
        self.listen_host = listen_host
        self.listen_port = listen_port
        self.outbound_ipv6 = outbound_ipv6
        self.username = username
        self.password_hash = password_hash
        self.timeout = timeout
        self.server: Optional[asyncio.AbstractServer] = None
        self.is_running = False
        self.bytes_in = 0
        self.bytes_out = 0
        self.active_connections = 0

    async def _handle_handshake(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> bool:
        """
        Performs SOCKS5 version and authentication method negotiation.
        """
        header = await reader.readexactly(2)
        version, nmethods = header[0], header[1]
        if version != SOCKS_VERSION:
            return False

        methods = await reader.readexactly(nmethods)

        # Require Username/Password authentication (0x02)
        if AUTH_METHOD_USER_PASS not in methods:
            writer.write(bytes([SOCKS_VERSION, AUTH_METHOD_NO_ACCEPTABLE]))
            await writer.drain()
            return False

        writer.write(bytes([SOCKS_VERSION, AUTH_METHOD_USER_PASS]))
        await writer.drain()

        # Perform RFC 1929 Username/Password Subnegotiation
        auth_version_byte = await reader.readexactly(1)
        if auth_version_byte[0] != 0x01:
            return False

        ulen_byte = await reader.readexactly(1)
        ulen = ulen_byte[0]
        uname_bytes = await reader.readexactly(ulen)
        client_username = uname_bytes.decode("utf-8", errors="ignore")

        plen_byte = await reader.readexactly(1)
        plen = plen_byte[0]
        pass_bytes = await reader.readexactly(plen)
        client_password = pass_bytes.decode("utf-8", errors="ignore")

        # Verify credentials
        is_valid_user = (client_username == self.username)
        is_valid_pass = SecurityEngine.verify_password(client_password, self.password_hash)

        if is_valid_user and is_valid_pass:
            # 0x01 = subnegotiation ver, 0x00 = success
            writer.write(bytes([0x01, 0x00]))
            await writer.drain()
            return True
        else:
            # 0x01 = subnegotiation ver, 0x01 = failure
            writer.write(bytes([0x01, 0x01]))
            await writer.drain()
            logger.info(f"[{self.proxy_id}] SOCKS5 Auth failure for user '{client_username}'")
            return False

    async def _create_outbound_connection(self, target_host: str, target_port: int) -> Tuple[asyncio.StreamReader, asyncio.StreamWriter]:
        """
        Creates an outbound socket bound to the assigned IPv6 address.
        """
        loop = asyncio.get_running_loop()
        addrinfo = await loop.getaddrinfo(target_host, target_port, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM)
        if not addrinfo:
            raise OSError(f"Could not resolve destination {target_host}")

        family, _, _, _, sockaddr = addrinfo[0]

        sock = socket.socket(family, socket.SOCK_STREAM)
        sock.setblocking(False)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

        # Bind outbound socket to designated egress IPv6 if target is IPv6
        if family == socket.AF_INET6:
            try:
                sock.bind((self.outbound_ipv6, 0))
            except OSError as e:
                logger.warning(f"[{self.proxy_id}] Could not bind egress IPv6 {self.outbound_ipv6}: {e}")

        await loop.sock_connect(sock, sockaddr)
        return await asyncio.open_connection(sock=sock)

    async def _relay_stream(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter, is_inbound: bool) -> None:
        buffer_size = 32768
        try:
            while self.is_running:
                data = await reader.read(buffer_size)
                if not data:
                    break
                writer.write(data)
                await writer.drain()
                if is_inbound:
                    self.bytes_in += len(data)
                else:
                    self.bytes_out += len(data)
        except (asyncio.CancelledError, ConnectionResetError, BrokenPipeError):
            pass
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

    async def _handle_client(self, client_reader: asyncio.StreamReader, client_writer: asyncio.StreamWriter) -> None:
        self.active_connections += 1
        try:
            auth_ok = await asyncio.wait_for(self._handle_handshake(client_reader, client_writer), timeout=self.timeout)
            if not auth_ok:
                return

            # Read SOCKS5 request: VER (1), CMD (1), RSV (1), ATYP (1)
            req_header = await client_reader.readexactly(4)
            ver, cmd, _, atyp = req_header[0], req_header[1], req_header[2], req_header[3]

            if ver != SOCKS_VERSION or cmd != CMD_CONNECT:
                # Command not supported
                reply = bytes([SOCKS_VERSION, REP_CMD_NOT_SUPPORTED, 0x00, ATYP_IPV4, 0, 0, 0, 0, 0, 0])
                client_writer.write(reply)
                await client_writer.drain()
                return

            # Parse destination address
            if atyp == ATYP_IPV4:
                addr_bytes = await client_reader.readexactly(4)
                target_host = socket.inet_ntop(socket.AF_INET, addr_bytes)
            elif atyp == ATYP_DOMAIN:
                dlen_byte = await client_reader.readexactly(1)
                domain_bytes = await client_reader.readexactly(dlen_byte[0])
                target_host = domain_bytes.decode("utf-8", errors="ignore")
            elif atyp == ATYP_IPV6:
                addr_bytes = await client_reader.readexactly(16)
                target_host = socket.inet_ntop(socket.AF_INET6, addr_bytes)
            else:
                reply = bytes([SOCKS_VERSION, REP_ATYP_NOT_SUPPORTED, 0x00, ATYP_IPV4, 0, 0, 0, 0, 0, 0])
                client_writer.write(reply)
                await client_writer.drain()
                return

            port_bytes = await client_reader.readexactly(2)
            target_port = struct.unpack("!H", port_bytes)[0]

            # Connect to target
            try:
                target_reader, target_writer = await self._create_outbound_connection(target_host, target_port)
            except Exception as e:
                logger.error(f"[{self.proxy_id}] SOCKS5 Outbound connect failed to {target_host}:{target_port} - {e}")
                reply = bytes([SOCKS_VERSION, REP_HOST_UNREACHABLE, 0x00, ATYP_IPV4, 0, 0, 0, 0, 0, 0])
                client_writer.write(reply)
                await client_writer.drain()
                return

            # Send success reply: 0x05, 0x00 (success), 0x00, 0x01 (IPv4 0.0.0.0:0)
            success_reply = bytes([SOCKS_VERSION, REP_SUCCESS, 0x00, ATYP_IPV4, 0, 0, 0, 0, 0, 0])
            client_writer.write(success_reply)
            await client_writer.drain()

            # Pipe bi-directional streams
            await asyncio.gather(
                self._relay_stream(client_reader, target_writer, is_inbound=True),
                self._relay_stream(target_reader, client_writer, is_inbound=False),
                return_exceptions=True
            )

        except (asyncio.TimeoutError, ConnectionResetError):
            pass
        except Exception as e:
            logger.debug(f"[{self.proxy_id}] Error in SOCKS5 session: {e}")
        finally:
            self.active_connections = max(0, self.active_connections - 1)
            try:
                client_writer.close()
                await client_writer.wait_closed()
            except Exception:
                pass

    async def start(self) -> None:
        """
        Starts the asynchronous SOCKS5 server on the configured port.
        """
        self.server = await asyncio.start_server(
            self._handle_client,
            host=self.listen_host,
            port=self.listen_port,
            family=socket.AF_INET6 if ":" in self.listen_host else socket.AF_INET,
            reuse_address=True
        )
        self.is_running = True
        logger.info(f"[{self.proxy_id}] 8WHIE SOCKS5 Proxy listening on [{self.listen_host}]:{self.listen_port} (Outbound: {self.outbound_ipv6})")

    async def stop(self) -> None:
        """
        Gracefully stops the SOCKS5 proxy server.
        """
        self.is_running = False
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            logger.info(f"[{self.proxy_id}] 8WHIE SOCKS5 Proxy stopped.")
