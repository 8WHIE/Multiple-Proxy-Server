"""
Asynchronous HTTP / HTTPS CONNECT Proxy Server with Outbound IPv6 Binding.
Author: Aryan Thakur (8WHIE)
Brand: 8WHIE
"""

import asyncio
import base64
import logging
import socket
from typing import Optional, Tuple
from ..core.security import SecurityEngine

logger = logging.getLogger("8whie.proxy.http")


class IPv6HttpProxyServer:
    """
    Original, asynchronous HTTP / CONNECT tunneling proxy.
    Binds outbound traffic specifically to an IPv6 egress address.
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

    def _verify_auth(self, auth_header: Optional[str]) -> bool:
        if not auth_header:
            return False
        parts = auth_header.strip().split()
        if len(parts) != 2 or parts[0].lower() != "basic":
            return False
        try:
            decoded = base64.b64decode(parts[1]).decode("utf-8")
            if ":" not in decoded:
                return False
            user, pwd = decoded.split(":", 1)
            if user != self.username:
                return False
            return SecurityEngine.verify_password(pwd, self.password_hash)
        except Exception:
            return False

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

    async def _create_outbound_connection(self, host: str, port: int) -> Tuple[asyncio.StreamReader, asyncio.StreamWriter]:
        """
        Creates an outbound TCP connection bound specifically to the designated outbound IPv6 address.
        """
        # Resolve destination
        loop = asyncio.get_running_loop()
        addrinfo = await loop.getaddrinfo(host, port, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM)
        if not addrinfo:
            raise OSError(f"Could not resolve host '{host}'")

        target_family, _, _, _, target_sockaddr = addrinfo[0]

        # Create socket
        sock = socket.socket(target_family, socket.SOCK_STREAM)
        sock.setblocking(False)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

        # If outbound target is IPv6, bind strictly to configured outbound_ipv6
        if target_family == socket.AF_INET6:
            try:
                sock.bind((self.outbound_ipv6, 0))
            except OSError as e:
                logger.warning(f"[{self.proxy_id}] Could not bind egress IPv6 {self.outbound_ipv6}: {e}")
        elif self.outbound_ipv6:
            # When target is IPv4, we can attempt dual-stack binding if supported
            pass

        # Connect asynchronously
        await loop.sock_connect(sock, target_sockaddr)
        return await asyncio.open_connection(sock=sock)

    async def _handle_client(self, client_reader: asyncio.StreamReader, client_writer: asyncio.StreamWriter) -> None:
        self.active_connections += 1
        client_addr = client_writer.get_extra_info("peername")
        try:
            # Read HTTP request line and headers
            header_data = bytearray()
            while True:
                line = await asyncio.wait_for(client_reader.readline(), timeout=self.timeout)
                if not line:
                    return
                header_data.extend(line)
                if header_data.endswith(b"\r\n\r\n") or header_data.endswith(b"\n\n"):
                    break
                if len(header_data) > 65536:
                    client_writer.write(b"HTTP/1.1 431 Request Header Fields Too Large\r\n\r\n")
                    await client_writer.drain()
                    return

            header_text = header_data.decode("iso-8859-1")
            lines = header_text.splitlines()
            if not lines:
                return

            req_line = lines[0].strip()
            req_parts = req_line.split()
            if len(req_parts) < 3:
                return

            method, target_uri, http_ver = req_parts[0].upper(), req_parts[1], req_parts[2]

            # Extract Proxy-Authorization header
            auth_header: Optional[str] = None
            for l in lines[1:]:
                if l.lower().startswith("proxy-authorization:"):
                    auth_header = l.split(":", 1)[1].strip()
                    break

            if not self._verify_auth(auth_header):
                response = (
                    b"HTTP/1.1 407 Proxy Authentication Required\r\n"
                    b"Proxy-Authenticate: Basic realm=\"8WHIE IPv6 Proxy Server\"\r\n"
                    b"Content-Length: 35\r\n"
                    b"Connection: close\r\n\r\n"
                    b"8WHIE Proxy: Authentication Required"
                )
                client_writer.write(response)
                await client_writer.drain()
                logger.info(f"[{self.proxy_id}] Unauthorized connection attempt from {client_addr}")
                return

            # Handle CONNECT tunneling (HTTPS)
            if method == "CONNECT":
                if ":" in target_uri:
                    target_host, target_port_str = target_uri.split(":", 1)
                    target_port = int(target_port_str)
                else:
                    target_host = target_uri
                    target_port = 443

                try:
                    target_reader, target_writer = await self._create_outbound_connection(target_host, target_port)
                except Exception as e:
                    logger.error(f"[{self.proxy_id}] Outbound connect failed for {target_host}:{target_port} - {e}")
                    client_writer.write(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
                    await client_writer.drain()
                    return

                client_writer.write(b"HTTP/1.1 200 Connection Established\r\nProxy-Agent: 8WHIE-IPv6-Proxy/1.0\r\n\r\n")
                await client_writer.drain()

                # Bi-directional pipe
                await asyncio.gather(
                    self._relay_stream(client_reader, target_writer, is_inbound=True),
                    self._relay_stream(target_reader, client_writer, is_inbound=False),
                    return_exceptions=True
                )

            else:
                # Plain HTTP forwarding
                # Parse host from target_uri or Host header
                parsed_host = ""
                parsed_port = 80
                if target_uri.startswith("http://"):
                    remainder = target_uri[7:]
                    path_slash = remainder.find("/")
                    host_port_segment = remainder[:path_slash] if path_slash != -1 else remainder
                    if ":" in host_port_segment:
                        parsed_host, p_str = host_port_segment.split(":", 1)
                        parsed_port = int(p_str)
                    else:
                        parsed_host = host_port_segment
                else:
                    for l in lines[1:]:
                        if l.lower().startswith("host:"):
                            host_val = l.split(":", 1)[1].strip()
                            if ":" in host_val:
                                parsed_host, p_str = host_val.split(":", 1)
                                parsed_port = int(p_str)
                            else:
                                parsed_host = host_val
                            break

                if not parsed_host:
                    client_writer.write(b"HTTP/1.1 400 Bad Request\r\n\r\n")
                    await client_writer.drain()
                    return

                try:
                    target_reader, target_writer = await self._create_outbound_connection(parsed_host, parsed_port)
                except Exception as e:
                    client_writer.write(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
                    await client_writer.drain()
                    return

                # Forward sanitized request to target (stripping Proxy-Authorization)
                forward_lines = [req_line]
                for l in lines[1:]:
                    if not l.lower().startswith("proxy-authorization:"):
                        forward_lines.append(l)
                sanitized_req = ("\r\n".join(forward_lines) + "\r\n\r\n").encode("iso-8859-1")

                target_writer.write(sanitized_req)
                await target_writer.drain()

                await asyncio.gather(
                    self._relay_stream(client_reader, target_writer, is_inbound=True),
                    self._relay_stream(target_reader, client_writer, is_inbound=False),
                    return_exceptions=True
                )

        except (asyncio.TimeoutError, ConnectionResetError):
            pass
        except Exception as e:
            logger.debug(f"[{self.proxy_id}] Error in client session: {e}")
        finally:
            self.active_connections = max(0, self.active_connections - 1)
            try:
                client_writer.close()
                await client_writer.wait_closed()
            except Exception:
                pass

    async def start(self) -> None:
        """
        Starts the asynchronous HTTP proxy server on the configured port.
        """
        self.server = await asyncio.start_server(
            self._handle_client,
            host=self.listen_host,
            port=self.listen_port,
            family=socket.AF_INET6 if ":" in self.listen_host else socket.AF_INET,
            reuse_address=True
        )
        self.is_running = True
        logger.info(f"[{self.proxy_id}] 8WHIE HTTP Proxy listening on [{self.listen_host}]:{self.listen_port} (Outbound: {self.outbound_ipv6})")

    async def stop(self) -> None:
        """
        Gracefully stops the HTTP proxy server and terminates client connections.
        """
        self.is_running = False
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            logger.info(f"[{self.proxy_id}] 8WHIE HTTP Proxy stopped.")
