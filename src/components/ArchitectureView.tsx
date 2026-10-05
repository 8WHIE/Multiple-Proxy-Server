import React from 'react';
import { Layers, Shield, Cpu, Terminal, ArrowRight, CheckCircle2, Server, Key, Lock, Network, FileCode } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-800/40 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                SYSTEM BLUEPRINT
              </span>
              <span className="text-xs text-slate-400">8WHIE IPv6 Proxy Manager</span>
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">
              Architecture & System Specification
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              An original, from-scratch self-hosted Linux multi-proxy daemon engineered by <strong className="text-cyan-400">Aryan Thakur</strong> under the <strong className="text-cyan-400">8WHIE</strong> brand. Each proxy endpoint independently maps client connections to an allocated host IPv6 address via kernel-level socket egress binding.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-right text-xs">
            <span className="text-slate-400">Brand Ownership:</span>
            <span className="text-cyan-300 font-bold text-sm tracking-wider">8WHIE</span>
            <span className="text-slate-400">Lead Architect:</span>
            <span className="text-white font-medium">Aryan Thakur</span>
          </div>
        </div>
      </div>

      {/* Component Diagram */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">1. Component Diagram & Data Flow</h3>
        </div>

        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-xs overflow-x-auto text-cyan-300 leading-relaxed">
          <pre>{`
  +----------------------------------------------------------------------------------------------------+
  |                                        LINUX SERVER HOST                                           |
  |                                                                                                    |
  |   Network Interface (eth0)                                     Local Process Isolation             |
  |   Assigned IPv6 Pool (/64 or /48)                             +--------------------------------+   |
  |   - 2001:db8:8whie::10                                         |   8WHIE CLI (8whie-proxy)      |   |
  |   - 2001:db8:8whie::11                                         +---------------+----------------+   |
  |   - 2001:db8:8whie::12                                                         |                    |
  |             |                                                                  v                    |
  |             v                                                  +--------------------------------+   |
  |   +------------------------------------+                       |   8WHIE Supervisor Engine      |   |
  |   |  Linux Kernel /proc/net/if_inet6   | <-------------------- |   (Lifecycle & Persistence)    |   |
  |   +-----------------+------------------+                       +---------------+----------------+   |
  |                     |                                                          |                    |
  |                     v                                                          v                    |
  |   +------------------------------------+                       +--------------------------------+   |
  |   |  IPv6 Discovery & Filter Engine    |                       |   Secure Config Store (0600)   |   |
  |   |  (Discards loopback / link-local)  |                       |   /etc/8whie-proxy/config.json |   |
  |   +------------------------------------+                       +---------------+----------------+   |
  |                                                                                |                    |
  |                                 +----------------------------------------------+                    |
  |                                 |                                                                   |
  |                                 v                                                                   v
  |               +-----------------------------------+               +-----------------------------------+
  |               |    HTTP/HTTPS CONNECT Proxy       |               |        SOCKS5 Proxy Daemon        |
  |               |    - Port: 8080                   |               |    - Port: 1080                   |
  |               |    - HTTP Basic Proxy-Auth        |               |    - RFC 1928 / RFC 1929 Auth     |
  |               |    - Egress Bind: 2001:db8::10    |               |    - Egress Bind: 2001:db8::11    |
  |               +-----------------+-----------------+               +-----------------+-----------------+
  |                                 |                                                   |               |
  |                                 +-------------------------+-------------------------+               |
  |                                                           v                                         |
  |                                            [ Linux Kernel TCP Socket Stack ]                        |
  |                                            setsockopt() & sock.bind((IPv6, 0))                      |
  +-----------------------------------------------------------+-----------------------------------------+
                                                              |
                                                              v
                                              [ Global IPv6 Public Internet ]
                                         (Target servers see designated IPv6 IP)
`}</pre>
        </div>
      </div>

      {/* Deployment Pipeline Flow */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">2. Deployment Architecture</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold text-xs mb-2">
              1
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Linux VPS</h4>
            <p className="text-[11px] text-slate-400">Ubuntu, Debian, Rocky with IPv6 networking active</p>
          </div>

          <div className="hidden md:flex items-center justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold text-xs mb-2">
              2
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Assigned IPv6 Pool</h4>
            <p className="text-[11px] text-slate-400">Multiple global IPv6 addresses provisioned on eth0</p>
          </div>

          <div className="hidden md:flex items-center justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold text-xs mb-2">
              3
            </div>
            <h4 className="text-xs font-bold text-white mb-1">8WHIE Proxy Manager</h4>
            <p className="text-[11px] text-slate-400">Daemon binds each proxy to dedicated IPv6 egress</p>
          </div>
        </div>
      </div>

      {/* Directory Structure & Technology Choices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Directory Structure */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileCode className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">3. Project Directory Structure</h3>
          </div>
          <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
            <pre>{`8whie-ipv6-proxy/
├── README.md                 # Complete documentation & branding
├── LICENSE                   # Apache 2.0 (Aryan Thakur / 8WHIE)
├── .gitignore                # Comprehensive Linux/Python rules
├── requirements.txt          # Python dependencies (click, rich, bcrypt)
├── setup.py                  # Package installation specification
├── config/
│   ├── proxy_config.example.json # Production JSON schema
│   └── proxy_config.example.yaml # Alternative YAML schema
├── src/
│   ├── __init__.py           # Package namespace
│   ├── cli.py                # 8whie-proxy CLI commands
│   ├── tester.py             # Internal loopback diagnostic suite
│   ├── core/
│   │   ├── network.py        # /proc/net/if_inet6 discovery & RFC 4291
│   │   ├── manager.py        # Supervisor, lifecycle & storage
│   │   ├── models.py         # Typed models & state validation
│   │   └── security.py       # Bcrypt, timing-safe auth & masks
│   └── servers/
│       ├── http_proxy.py     # Asyncio HTTP CONNECT / forward proxy
│       └── socks5_proxy.py   # RFC 1928 / 1929 SOCKS5 proxy
├── scripts/
│   ├── install.sh            # Automated system installer
│   └── uninstall.sh          # Safe uninstaller
├── systemd/
│   └── 8whie-proxy.service   # Hardened sandboxed service unit
├── docker/
│   ├── Dockerfile            # Debian Bookworm container
│   ├── docker-compose.yml    # Host IPv6 networking stack
│   └── entrypoint.sh         # Container boot script
├── tests/
│   ├── test_network.py       # IPv6 parser & filter tests
│   ├── test_config.py        # Port bounds & duplicate checks
│   ├── test_security.py      # Password & secret masking tests
│   └── test_servers.py       # HTTP & SOCKS5 protocol tests
└── docs/
    ├── ARCHITECTURE.md       # Socket binding mechanics
    ├── SECURITY.md           # Firewall & hardening principles
    └── TROUBLESHOOTING.md    # Kernel sysctl & error resolutions`}</pre>
          </div>
        </div>

        {/* Technology Choices */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">4. Technology Choices & Justification</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-cyan-400 font-bold">Python 3.9+ & Asyncio:</span>
              <p className="text-slate-400 mt-1">
                Standard across all enterprise Linux distributions. Python's built-in <code className="text-slate-200">asyncio</code> provides non-blocking, multiplexed I/O allowing thousands of concurrent proxy streams per single core without multi-threading overhead.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-cyan-400 font-bold">Native Kernel Parsing (/proc/net/if_inet6):</span>
              <p className="text-slate-400 mt-1">
                Directly reads Linux virtual filesystem rather than relying on external binaries that may not be in system PATH. Provides zero-latency, deterministic IPv6 discovery.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-cyan-400 font-bold">Bcrypt & secrets.compare_digest:</span>
              <p className="text-slate-400 mt-1">
                Salted credential hashing resilient against rainbow tables. Authentication evaluation uses constant-time string comparisons to eliminate microarchitectural timing attacks.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-cyan-400 font-bold">Click + Rich CLI:</span>
              <p className="text-slate-400 mt-1">
                Structured subcommands (<code className="text-slate-200">scan, list, add, start, test</code>), ANSI-compliant terminal tables, and consistent exit codes for CI/CD or cron scripts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Model & Installation Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Model */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">5. Security Model</h3>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Mandatory Authentication:</strong> No open relays. Every port requires HTTP Basic or SOCKS5 credentials.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Restricted POSIX Permissions:</strong> Config files containing password hashes are locked to <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">0600</code>.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Zero-Credential Logging:</strong> Authorization headers and passwords are scrubbed before reaching file logs.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Systemd Kernel Sandboxing:</strong> Uses <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">ProtectSystem=strict</code>, <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">ProtectHome=true</code>, and <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded">NoNewPrivileges=true</code>.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Strict RFC 4291 Sanitization:</strong> Blocks shell injections by parsing all IP inputs through Python's standard IP address engine.</span>
            </li>
          </ul>
        </div>

        {/* Installation Flow */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">6. Installation Flow</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold shrink-0">1</span>
              <div>
                <p className="font-semibold text-white">Host Privilege & Package Validation</p>
                <p className="text-slate-400">Verifies root/sudo, checks Python 3.9+, venv, and iproute2 packages.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold shrink-0">2</span>
              <div>
                <p className="font-semibold text-white">System Service Account Provisioning</p>
                <p className="text-slate-400">Creates unprivileged daemon user <code className="text-slate-200">whieproxy</code> with no shell login.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold shrink-0">3</span>
              <div>
                <p className="font-semibold text-white">Isolated Virtualenv & Code Deployment</p>
                <p className="text-slate-400">Deploys to <code className="text-slate-200">/opt/8whie-proxy</code>, links <code className="text-slate-200">/usr/local/bin/8whie-proxy</code>.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold shrink-0">4</span>
              <div>
                <p className="font-semibold text-white">Systemd Unit Registration & Boot Enablement</p>
                <p className="text-slate-400">Enables <code className="text-slate-200">8whie-proxy.service</code> with restart-on-failure policy.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
