"""
8WHIE IPv6 Proxy Manager - Command Line Interface (CLI)
Developer: Aryan Thakur
Brand: 8WHIE
"""

import asyncio
import json
import logging
import os
import sys
from typing import Optional

import click

from .core.manager import ProxySupervisor
from .core.models import ProxyStatus
from .core.network import IPv6NetworkDiscovery
from .core.security import SecurityEngine
from .tester import ProxyDiagnosticTester

try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.text import Text
    HAS_RICH = True
    console = Console()
except ImportError:
    HAS_RICH = False
    console = None

BANNER_TEXT = """
 [bold cyan]██████╗ ██╗    ██╗██╗  ██╗██╗███████╗[/bold cyan]   [bold white]IPv6 Proxy Manager[/bold white]
 [bold cyan]██╔══██╗██║    ██║██║  ██║██║██╔════╝[/bold cyan]   [dim]Self-Hosted Multi-Proxy System[/dim]
 [bold cyan]███████║██║ █╗ ██║███████║██║█████╗  [/bold cyan]   [yellow]Developer:[/yellow] Aryan Thakur
 [bold cyan]██╔══██║██║███╗██║██╔══██║██║██╔══╝  [/bold cyan]   [yellow]Brand:[/yellow] 8WHIE
 [bold cyan]██████╔╝╚███╔███╔╝██║  ██║██║███████╗[/bold cyan]   [green]Version:[/green] 1.0.0
 [bold cyan]╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝╚══════╝[/bold cyan]
"""


def print_banner():
    if HAS_RICH:
        console.print(BANNER_TEXT)
    else:
        print("=" * 60)
        print("  8WHIE IPv6 Proxy Manager | By Aryan Thakur (8WHIE)")
        print("=" * 60)


@click.group(context_settings=dict(help_option_names=["-h", "--help"]))
@click.version_option("1.0.0", prog_name="8WHIE IPv6 Proxy Manager")
@click.option("--config", "-c", default=None, help="Custom path to config.json file")
@click.pass_context
def cli(ctx, config):
    """
    8WHIE IPv6 Proxy Manager - Linux IPv6 multi-proxy management utility.
    Built by Aryan Thakur.
    """
    ctx.ensure_object(dict)
    ctx.obj["config_path"] = config
    ctx.obj["supervisor"] = ProxySupervisor(config_path=config)


@cli.command("scan")
@click.pass_context
def cmd_scan(ctx):
    """
    Scan and display all available global IPv6 addresses assigned to host interfaces.
    """
    print_banner()
    if HAS_RICH:
        console.print("[bold yellow]Scanning host network interfaces for global IPv6 addresses...[/bold yellow]\n")
    else:
        print("Scanning host network interfaces for global IPv6 addresses...\n")

    addresses = IPv6NetworkDiscovery.discover_addresses()
    supervisor = ctx.obj["supervisor"]
    assigned_ips = {p.ipv6_address for p in supervisor.config.proxies}

    if not addresses:
        msg = "No global IPv6 addresses detected automatically. (Ensure IPv6 is enabled on interface or add manually via '8whie-proxy add')."
        if HAS_RICH:
            console.print(f"[red]{msg}[/red]")
        else:
            print(msg)
        return

    if HAS_RICH:
        table = Table(title="[bold green]Detected Global IPv6 Addresses[/bold green]", show_header=True)
        table.add_column("Interface", style="cyan")
        table.add_column("IPv6 Address", style="bold white")
        table.add_column("Prefix", justify="right")
        table.add_column("In Use by Proxy?", style="magenta")
        table.add_column("Status / Details", style="green")

        for addr in addresses:
            in_use = "Yes" if addr.address in assigned_ips else "Available"
            in_use_styled = f"[bold green]{in_use}[/bold green]" if in_use == "Available" else f"[bold yellow]{in_use}[/bold yellow]"
            table.add_row(addr.interface, addr.address, f"/{addr.prefix_len}", in_use_styled, addr.details)

        console.print(table)
    else:
        print(f"{'Interface':<12} {'IPv6 Address':<40} {'Prefix':<8} {'Assigned?'}")
        print("-" * 75)
        for addr in addresses:
            in_use = "YES" if addr.address in assigned_ips else "NO"
            print(f"{addr.interface:<12} {addr.address:<40} /{addr.prefix_len:<7} {in_use}")


@cli.command("list")
@click.pass_context
def cmd_list(ctx):
    """
    List all configured HTTP and SOCKS5 proxies.
    """
    print_banner()
    supervisor = ctx.obj["supervisor"]
    proxies = supervisor.config.proxies

    if not proxies:
        if HAS_RICH:
            console.print("[yellow]No proxies configured yet. Use '8whie-proxy add' to configure your first proxy.[/yellow]")
        else:
            print("No proxies configured yet. Use '8whie-proxy add' to create one.")
        return

    if HAS_RICH:
        table = Table(title="[bold cyan]Configured 8WHIE Proxy Fleet[/bold cyan]", show_header=True)
        table.add_column("ID", style="bold cyan")
        table.add_column("Type", style="green")
        table.add_column("Port", justify="right", style="white")
        table.add_column("Bound IPv6 Address", style="magenta")
        table.add_column("Username", style="yellow")
        table.add_column("Enabled", justify="center")
        table.add_column("Status", style="bold")

        for p in proxies:
            p_type = p.type.value if hasattr(p.type, "value") else str(p.type)
            p_status = p.status.value if hasattr(p.status, "value") else str(p.status)
            status_color = "green" if p_status == "running" else "dim"
            table.add_row(
                p.id,
                p_type.upper(),
                str(p.port),
                p.ipv6_address,
                p.username,
                "✓" if p.enabled else "✗",
                f"[{status_color}]{p_status.upper()}[/{status_color}]"
            )
        console.print(table)
    else:
        print(f"{'ID':<16} {'Type':<8} {'Port':<6} {'IPv6 Address':<40} {'User':<12} {'Status'}")
        print("-" * 95)
        for p in proxies:
            p_type = p.type.value if hasattr(p.type, "value") else str(p.type)
            p_status = p.status.value if hasattr(p.status, "value") else str(p.status)
            print(f"{p.id:<16} {p_type.upper():<8} {p.port:<6} {p.ipv6_address:<40} {p.username:<12} {p_status}")


@cli.command("add")
@click.option("--type", "-t", "proxy_type", type=click.Choice(["http", "socks5"], case_fold=True), required=True, help="Proxy protocol type")
@click.option("--port", "-p", type=int, required=True, help="Listening TCP port (1-65535)")
@click.option("--ipv6", "-i", "ipv6_addr", required=True, help="Assigned IPv6 address to bind outbound")
@click.option("--user", "-u", default=None, help="Proxy username (min 2 chars)")
@click.option("--password", default=None, help="Plaintext password")
@click.option("--auto-auth", is_flag=True, help="Automatically generate strong username and random password")
@click.option("--id", "proxy_id", default=None, help="Custom identifier for the proxy endpoint")
@click.pass_context
def cmd_add(ctx, proxy_type, port, ipv6_addr, user, password, auto_auth, proxy_id):
    """
    Add and configure a new IPv6-bound HTTP or SOCKS5 proxy endpoint.
    """
    supervisor = ctx.obj["supervisor"]

    # Authentication resolution
    if auto_auth:
        user = user or f"user_{port}"
        password = SecurityEngine.generate_secure_password(18)
        generated_password = password
    else:
        if not user:
            user = click.prompt("Proxy Username", type=str)
        if not password:
            password = click.prompt("Proxy Password", hide_input=True, confirmation_prompt=True)
        generated_password = None

    success, message, endpoint = supervisor.add_proxy(
        proxy_type=proxy_type,
        port=port,
        ipv6_address=ipv6_addr,
        username=user,
        password=password,
        proxy_id=proxy_id,
        validate_live_bind=False
    )

    if not success:
        if HAS_RICH:
            console.print(f"[bold red]Error:[/bold red] {message}")
        else:
            print(f"Error: {message}")
        sys.exit(1)

    if HAS_RICH:
        console.print(f"[bold green]✓ {message}[/bold green]")
        if generated_password:
            console.print(Panel(
                f"[bold white]Username:[/bold white] [cyan]{user}[/cyan]\n"
                f"[bold white]Password:[/bold white] [green]{generated_password}[/green]\n"
                f"[dim]Store these credentials securely. They will not be displayed again in cleartext.[/dim]",
                title="[bold yellow]Generated Proxy Credentials[/bold yellow]"
            ))
    else:
        print(f"✓ {message}")
        if generated_password:
            print(f"Username: {user}")
            print(f"Password: {generated_password}")
            print("(Store these credentials securely. Cleartext passwords are not saved in logs.)")


@cli.command("remove")
@click.argument("proxy_id")
@click.pass_context
def cmd_remove(ctx, proxy_id):
    """
    Remove a proxy endpoint by ID.
    """
    supervisor = ctx.obj["supervisor"]
    success, message = supervisor.remove_proxy(proxy_id)
    if success:
        if HAS_RICH:
            console.print(f"[bold green]✓ {message}[/bold green]")
        else:
            print(f"✓ {message}")
    else:
        if HAS_RICH:
            console.print(f"[bold red]Error:[/bold red] {message}")
        else:
            print(f"Error: {message}")
        sys.exit(1)


@cli.command("test")
@click.argument("proxy_id", required=False)
@click.pass_context
def cmd_test(ctx, proxy_id):
    """
    Safely diagnose and verify proxy process, socket listening, and authentication.
    """
    supervisor = ctx.obj["supervisor"]
    proxies = supervisor.config.proxies

    if proxy_id:
        targets = [p for p in proxies if p.id == proxy_id]
        if not targets:
            click.echo(f"Error: Proxy '{proxy_id}' not found.")
            sys.exit(1)
    else:
        targets = proxies

    if not targets:
        click.echo("No proxies to test.")
        return

    if HAS_RICH:
        console.print(f"[bold cyan]Running 8WHIE Diagnostic Self-Tests ({len(targets)} endpoint(s))...[/bold cyan]\n")

    for p in targets:
        result = asyncio.run(ProxyDiagnosticTester.test_endpoint(p))
        if HAS_RICH:
            status_badge = "[bold green]PASS[/bold green]" if result.port_listening and result.auth_verified else "[bold red]FAIL[/bold red]"
            console.print(f"{status_badge} [cyan]{p.id}[/cyan] ({p.type.upper()}:{p.port}) -> Bind: [magenta]{p.ipv6_address}[/magenta]")
            console.print(f"   Listening: {'✓' if result.port_listening else '✗'} | Auth: {'✓' if result.auth_verified else '✗'} | Latency: {result.latency_ms}ms")
            if result.error_message:
                console.print(f"   [yellow]Notice: {result.error_message}[/yellow]")
        else:
            state = "PASS" if result.port_listening and result.auth_verified else "FAIL"
            print(f"[{state}] {p.id} ({p.type}:{p.port}) - Latency: {result.latency_ms}ms - Reason: {result.error_message or 'OK'}")


@cli.command("status")
@click.pass_context
def cmd_status(ctx):
    """
    Display comprehensive system and proxy daemon status.
    """
    print_banner()
    supervisor = ctx.obj["supervisor"]
    cfg = supervisor.config

    if HAS_RICH:
        info_panel = Panel(
            f"[bold white]Service Name:[/bold white] {cfg.name}\n"
            f"[bold white]Developer:[/bold white] Aryan Thakur (8WHIE)\n"
            f"[bold white]Config File:[/bold white] {supervisor.config_path}\n"
            f"[bold white]Log File:[/bold white] {cfg.log_file}\n"
            f"[bold white]Total Configured Proxies:[/bold white] {len(cfg.proxies)}\n"
            f"[bold white]Listening Interface:[/bold white] [{cfg.listen_host}]",
            title="[bold green]8WHIE Service Status[/bold green]"
        )
        console.print(info_panel)
    else:
        print(f"Service: {cfg.name} (Aryan Thakur / 8WHIE)")
        print(f"Config: {supervisor.config_path}")
        print(f"Total Proxies: {len(cfg.proxies)}")


@cli.command("start")
@click.argument("target", default="all")
@click.pass_context
def cmd_start(ctx, target):
    """
    Start configured proxy server instances ('all' or specific proxy ID).
    """
    supervisor = ctx.obj["supervisor"]
    if target == "all":
        results = asyncio.run(supervisor.start_all())
        click.echo(f"Started {len(results)} proxy instance(s).")
    else:
        success, msg = asyncio.run(supervisor.start_proxy(target))
        if success:
            click.echo(f"✓ {msg}")
        else:
            click.echo(f"Error: {msg}")
            sys.exit(1)


@cli.command("stop")
@click.argument("target", default="all")
@click.pass_context
def cmd_stop(ctx, target):
    """
    Stop active proxy server instances.
    """
    supervisor = ctx.obj["supervisor"]
    if target == "all":
        results = asyncio.run(supervisor.stop_all())
        click.echo(f"Stopped {len(results)} proxy instance(s).")
    else:
        success, msg = asyncio.run(supervisor.stop_proxy(target))
        click.echo(f"✓ {msg}")


@cli.command("restart")
@click.argument("target", default="all")
@click.pass_context
def cmd_restart(ctx, target):
    """
    Restart proxy instances.
    """
    supervisor = ctx.obj["supervisor"]
    if target == "all":
        asyncio.run(supervisor.stop_all())
        results = asyncio.run(supervisor.start_all())
        click.echo(f"Restarted {len(results)} proxy instance(s).")
    else:
        success, msg = asyncio.run(supervisor.restart_proxy(target))
        click.echo(f"✓ {msg}")


@cli.command("logs")
@click.option("--lines", "-n", default=30, help="Number of trailing log lines to view")
@click.pass_context
def cmd_logs(ctx, lines):
    """
    Inspect sanitized server activity logs.
    """
    supervisor = ctx.obj["supervisor"]
    log_path = supervisor.config.log_file
    if not os.path.exists(log_path):
        click.echo(f"Log file {log_path} not created yet. Proxies may not have generated traffic.")
        return

    with open(log_path, "r", encoding="utf-8", errors="replace") as f:
        file_lines = f.readlines()
        tail = file_lines[-lines:]
        for l in tail:
            sys.stdout.write(l)


@cli.command("config")
@click.pass_context
def cmd_config(ctx):
    """
    Print the current configuration in clean JSON format.
    """
    supervisor = ctx.obj["supervisor"]
    data = supervisor.config.to_dict(redact_secrets=True)
    click.echo(json.dumps(data, indent=2))


if __name__ == "__main__":
    cli()
