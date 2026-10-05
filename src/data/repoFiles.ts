/**
 * 8WHIE IPv6 Proxy Manager - Repository Registry
 * Developer: Aryan Thakur (8WHIE)
 */

export interface RepoFile {
  path: string;
  name: string;
  category: 'core' | 'servers' | 'cli' | 'config' | 'scripts' | 'systemd' | 'docker' | 'tests' | 'docs' | 'meta';
  language: string;
  description: string;
}

export const REPO_FILES: RepoFile[] = [
  {
    path: 'README.md',
    name: 'README.md',
    category: 'meta',
    language: 'markdown',
    description: 'Project overview, quickstart, architecture, and manual guide',
  },
  {
    path: 'LICENSE',
    name: 'LICENSE',
    category: 'meta',
    language: 'text',
    description: 'Apache License 2.0 attribution for Aryan Thakur (8WHIE)',
  },
  {
    path: 'requirements.txt',
    name: 'requirements.txt',
    category: 'meta',
    language: 'text',
    description: 'Python runtime dependencies (click, rich, bcrypt, etc.)',
  },
  {
    path: 'setup.py',
    name: 'setup.py',
    category: 'meta',
    language: 'python',
    description: 'Package specification and CLI entrypoint setup',
  },
  {
    path: 'config/proxy_config.example.json',
    name: 'proxy_config.example.json',
    category: 'config',
    language: 'json',
    description: 'Production JSON configuration schema template',
  },
  {
    path: 'config/proxy_config.example.yaml',
    name: 'proxy_config.example.yaml',
    category: 'config',
    language: 'yaml',
    description: 'YAML configuration schema alternative',
  },
  {
    path: 'src/cli.py',
    name: 'cli.py',
    category: 'cli',
    language: 'python',
    description: 'The 8whie-proxy command line interface executable',
  },
  {
    path: 'src/core/network.py',
    name: 'network.py',
    category: 'core',
    language: 'python',
    description: 'Linux /proc/net/if_inet6 discovery & RFC 4291 validator',
  },
  {
    path: 'src/core/manager.py',
    name: 'manager.py',
    category: 'core',
    language: 'python',
    description: 'Proxy supervisor, lifecycle coordinator & config storage',
  },
  {
    path: 'src/core/models.py',
    name: 'models.py',
    category: 'core',
    language: 'python',
    description: 'Dataclasses, types, and model validation logic',
  },
  {
    path: 'src/core/security.py',
    name: 'security.py',
    category: 'core',
    language: 'python',
    description: 'Bcrypt hashing, timing-safe verification & secret masking',
  },
  {
    path: 'src/servers/http_proxy.py',
    name: 'http_proxy.py',
    category: 'servers',
    language: 'python',
    description: 'Asyncio HTTP CONNECT & Forward proxy with IPv6 egress binding',
  },
  {
    path: 'src/servers/socks5_proxy.py',
    name: 'socks5_proxy.py',
    category: 'servers',
    language: 'python',
    description: 'RFC 1928 / RFC 1929 SOCKS5 proxy with IPv6 egress binding',
  },
  {
    path: 'src/tester.py',
    name: 'tester.py',
    category: 'core',
    language: 'python',
    description: 'Safe loopback diagnostic & proxy verification harness',
  },
  {
    path: 'scripts/install.sh',
    name: 'install.sh',
    category: 'scripts',
    language: 'bash',
    description: 'Linux production installer with systemd setup',
  },
  {
    path: 'scripts/uninstall.sh',
    name: 'uninstall.sh',
    category: 'scripts',
    language: 'bash',
    description: 'Clean uninstallation script',
  },
  {
    path: 'systemd/8whie-proxy.service',
    name: '8whie-proxy.service',
    category: 'systemd',
    language: 'ini',
    description: 'Hardened Linux systemd service unit with sandboxing',
  },
  {
    path: 'docker/Dockerfile',
    name: 'Dockerfile',
    category: 'docker',
    language: 'dockerfile',
    description: 'Lightweight Debian Bookworm container image',
  },
  {
    path: 'docker/docker-compose.yml',
    name: 'docker-compose.yml',
    category: 'docker',
    language: 'yaml',
    description: 'Docker Compose orchestration with host IPv6 network mode',
  },
  {
    path: 'tests/test_network.py',
    name: 'test_network.py',
    category: 'tests',
    language: 'python',
    description: 'Automated tests for IPv6 parsing and filtering',
  },
  {
    path: 'tests/test_config.py',
    name: 'test_config.py',
    category: 'tests',
    language: 'python',
    description: 'Automated tests for configuration schema validation',
  },
  {
    path: 'tests/test_security.py',
    name: 'test_security.py',
    category: 'tests',
    language: 'python',
    description: 'Automated tests for password hashing & secret masking',
  },
  {
    path: 'tests/test_servers.py',
    name: 'test_servers.py',
    category: 'tests',
    language: 'python',
    description: 'Automated tests for HTTP auth & SOCKS5 negotiation',
  },
  {
    path: 'docs/ARCHITECTURE.md',
    name: 'ARCHITECTURE.md',
    category: 'docs',
    language: 'markdown',
    description: 'Detailed architectural and network socket binding design',
  },
  {
    path: 'docs/SECURITY.md',
    name: 'SECURITY.md',
    category: 'docs',
    language: 'markdown',
    description: 'Security model, firewalls, and credential hardening',
  },
  {
    path: 'docs/TROUBLESHOOTING.md',
    name: 'TROUBLESHOOTING.md',
    category: 'docs',
    language: 'markdown',
    description: 'Common Linux network errors, routing, and resolutions',
  },
];
