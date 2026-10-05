import React, { useState } from 'react';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { ArchitectureView } from './components/ArchitectureView';
import { DiscoveryStudio } from './components/DiscoveryStudio';
import { ProxyManager } from './components/ProxyManager';
import { CliTerminal } from './components/CliTerminal';
import { DiagnosticTester } from './components/DiagnosticTester';
import { LogsViewer } from './components/LogsViewer';
import { RepoExplorer } from './components/RepoExplorer';
import { DiscoveredIPv6, ManagedProxy, SystemLogEntry } from './types';
import { REPO_CONTENT_MAP } from './data/fileContents';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('architecture');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [preselectedIp, setPreselectedIp] = useState<string | undefined>(undefined);

  // Initial discovered IPv6 network addresses (including routable global & filtered local/loopback)
  const [addresses, setAddresses] = useState<DiscoveredIPv6[]>([
    {
      interface: 'eth0',
      address: '2001:db8:8whie::10',
      prefixLen: 64,
      scope: 'global',
      isGlobal: true,
      inUseBy: 'px-http-8080',
      details: 'Assigned public IPv6 host address on eth0',
    },
    {
      interface: 'eth0',
      address: '2001:db8:8whie::11',
      prefixLen: 64,
      scope: 'global',
      isGlobal: true,
      inUseBy: 'px-socks-1080',
      details: 'Assigned public IPv6 host address on eth0',
    },
    {
      interface: 'eth0',
      address: '2001:db8:8whie::12',
      prefixLen: 64,
      scope: 'global',
      isGlobal: true,
      details: 'Unassigned global IPv6 address ready for proxy binding',
    },
    {
      interface: 'eth0',
      address: '2001:db8:8whie::13',
      prefixLen: 64,
      scope: 'global',
      isGlobal: true,
      details: 'Unassigned global IPv6 address ready for proxy binding',
    },
    {
      interface: 'lo',
      address: '::1',
      prefixLen: 128,
      scope: 'host',
      isGlobal: false,
      details: 'RFC 4291 Loopback address - discarded from proxy egress',
    },
    {
      interface: 'eth0',
      address: 'fe80::216:3eff:fe19:8wh1',
      prefixLen: 64,
      scope: 'link',
      isGlobal: false,
      details: 'RFC 4291 Link-local unicast - discarded from public routing',
    },
    {
      interface: 'eth0',
      address: 'ff02::1',
      prefixLen: 128,
      scope: 'multicast',
      isGlobal: false,
      details: 'All-nodes multicast address - discarded',
    },
  ]);

  // Initial configured proxies
  const [proxies, setProxies] = useState<ManagedProxy[]>([
    {
      id: 'px-http-8080',
      type: 'http',
      port: 8080,
      ipv6Address: '2001:db8:8whie::10',
      username: 'aryan_http',
      passwordHash: '$2b$12$eX4mP1eH4sH8wh1eSecur3H4shExampleDoNotUseInProd123456',
      enabled: true,
      status: 'running',
      maxConnections: 500,
      timeoutSeconds: 60,
      description: 'Primary HTTP IPv6 outbound tunnel',
      bytesIn: 1048576 * 4.2,
      bytesOut: 1048576 * 18.7,
      activeConnections: 3,
      createdAt: Date.now() - 3600000 * 2,
    },
    {
      id: 'px-socks-1080',
      type: 'socks5',
      port: 1080,
      ipv6Address: '2001:db8:8whie::11',
      username: 'aryan_socks',
      passwordHash: '$2b$12$fX4mP1eH4sH8wh1eSecur3H4shExampleDoNotUseInProd654321',
      enabled: true,
      status: 'running',
      maxConnections: 500,
      timeoutSeconds: 60,
      description: 'Dedicated SOCKS5 IPv6 scraping endpoint',
      bytesIn: 1048576 * 1.8,
      bytesOut: 1048576 * 9.4,
      activeConnections: 2,
      createdAt: Date.now() - 3600000,
    },
  ]);

  // Initial sanitized system logs
  const [logs, setLogs] = useState<SystemLogEntry[]>([
    {
      id: '1',
      timestamp: '2026-10-04 19:35:10',
      level: 'INFO',
      message: '8WHIE IPv6 Proxy Manager daemon initialized by Aryan Thakur.',
    },
    {
      id: '2',
      timestamp: '2026-10-04 19:35:11',
      level: 'INFO',
      message: 'Interface eth0 scanned: 4 global IPv6 addresses discovered.',
    },
    {
      id: '3',
      timestamp: '2026-10-04 19:35:12',
      level: 'SECURITY',
      message: 'Configuration permissions verified: /etc/8whie-proxy/config.json is 0600.',
    },
    {
      id: '4',
      timestamp: '2026-10-04 19:35:15',
      level: 'INFO',
      proxyId: 'px-http-8080',
      message: 'HTTP Proxy bound to [::]:8080 (Outbound IPv6: 2001:db8:8whie::10).',
    },
    {
      id: '5',
      timestamp: '2026-10-04 19:35:16',
      level: 'INFO',
      proxyId: 'px-socks-1080',
      message: 'SOCKS5 Proxy bound to [::]:1080 (Outbound IPv6: 2001:db8:8whie::11).',
    },
    {
      id: '6',
      timestamp: '2026-10-04 19:38:22',
      level: 'SECURITY',
      proxyId: 'px-http-8080',
      message: 'Proxy-Authorization verified successfully for user "aryan_http" via constant-time digest.',
    },
  ]);

  const addLog = (level: SystemLogEntry['level'], message: string, proxyId?: string) => {
    const newEntry: SystemLogEntry = {
      id: String(Date.now() + Math.random()),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      level,
      proxyId,
      message,
    };
    setLogs((prev) => [newEntry, ...prev]);
  };

  // Rescan network interfaces
  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      addLog('INFO', `Manual interface scan completed. ${addresses.filter(a => a.isGlobal).length} global addresses validated.`);
    }, 600);
  };

  // Add manual IPv6 address with RFC 4291 validation
  const handleAddManualIp = (ipStr: string, iface: string) => {
    // Validate
    const trimmed = ipStr.trim().toLowerCase();
    if (trimmed.startsWith('fe80:') || trimmed.startsWith('fe8') || trimmed.startsWith('fe9') || trimmed.startsWith('fea') || trimmed.startsWith('feb')) {
      return { success: false, message: 'Rejected: Address is link-local (fe80::/10).' };
    }
    if (trimmed === '::1' || trimmed === '::') {
      return { success: false, message: 'Rejected: Address is loopback or unspecified.' };
    }
    if (trimmed.startsWith('ff')) {
      return { success: false, message: 'Rejected: Address is multicast (ff00::/8).' };
    }
    if (!trimmed.includes(':') || trimmed.length < 3) {
      return { success: false, message: 'Rejected: Invalid IPv6 syntax format.' };
    }
    if (addresses.some(a => a.address.toLowerCase() === trimmed)) {
      return { success: false, message: 'Address already exists in discovered list.' };
    }

    const newAddr: DiscoveredIPv6 = {
      interface: iface || 'eth0',
      address: trimmed,
      prefixLen: 64,
      scope: 'global',
      isGlobal: true,
      details: 'Manually verified and registered IPv6 address',
    };

    setAddresses(prev => [newAddr, ...prev]);
    addLog('INFO', `Manually registered global IPv6 address: ${trimmed} on ${newAddr.interface}`);
    return { success: true, message: `Successfully registered ${trimmed} on ${newAddr.interface}` };
  };

  // Quick switch from discovery to proxy creation with preselected IP
  const handleSelectIpForProxy = (ip: string) => {
    setPreselectedIp(ip);
    setActiveTab('proxies');
  };

  // Add Proxy Endpoint
  const handleAddProxy = (proxyData: Omit<ManagedProxy, 'id' | 'status' | 'bytesIn' | 'bytesOut' | 'activeConnections' | 'createdAt'>) => {
    // Check port uniqueness
    if (proxies.some(p => p.port === proxyData.port)) {
      return { success: false, message: `Port ${proxyData.port} is already configured on another proxy.` };
    }

    const newId = `px-${proxyData.type}-${proxyData.port}`;
    const newProxy: ManagedProxy = {
      ...proxyData,
      id: newId,
      status: 'running',
      bytesIn: 0,
      bytesOut: 0,
      activeConnections: 0,
      createdAt: Date.now(),
    };

    setProxies(prev => [...prev, newProxy]);

    // Update assignment badge in discovered list
    setAddresses(prev => prev.map(a => a.address === proxyData.ipv6Address ? { ...a, inUseBy: newId } : a));

    addLog('INFO', `Created new ${proxyData.type.toUpperCase()} proxy endpoint '${newId}' on port ${proxyData.port} (IPv6: ${proxyData.ipv6Address}).`, newId);
    return { success: true, message: `Proxy '${newId}' successfully initialized and listening on port ${proxyData.port}.` };
  };

  // Lifecycle handlers
  const handleStartProxy = (id: string) => {
    setProxies(prev => prev.map(p => p.id === id ? { ...p, status: 'running' } : p));
    addLog('INFO', `Proxy server instance started on port ${proxies.find(p => p.id === id)?.port}.`, id);
  };

  const handleStopProxy = (id: string) => {
    setProxies(prev => prev.map(p => p.id === id ? { ...p, status: 'stopped', activeConnections: 0 } : p));
    addLog('INFO', `Proxy server instance stopped.`, id);
  };

  const handleRestartProxy = (id: string) => {
    handleStopProxy(id);
    setTimeout(() => {
      handleStartProxy(id);
      addLog('INFO', `Proxy server instance restarted cleanly.`, id);
    }, 400);
  };

  const handleDeleteProxy = (id: string) => {
    const toDelete = proxies.find(p => p.id === id);
    setProxies(prev => prev.filter(p => p.id !== id));
    if (toDelete) {
      setAddresses(prev => prev.map(a => a.inUseBy === id ? { ...a, inUseBy: undefined } : a));
      addLog('WARN', `Proxy '${id}' removed from configuration supervisor.`, id);
    }
  };

  const handleStartAll = () => {
    setProxies(prev => prev.map(p => ({ ...p, status: 'running' })));
    addLog('INFO', 'All configured proxy server instances started.');
  };

  const handleStopAll = () => {
    setProxies(prev => prev.map(p => ({ ...p, status: 'stopped', activeConnections: 0 })));
    addLog('INFO', 'All proxy server instances stopped.');
  };

  // Download complete 8whie-ipv6-proxy.zip archive
  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('8whie-ipv6-proxy');

      if (rootFolder) {
        // Populate all files from the REPO_CONTENT_MAP
        Object.entries(REPO_CONTENT_MAP).forEach(([path, content]) => {
          rootFolder.file(path, content);
        });

        // Generate dynamic current config.json from state
        const currentConfig = {
          system: {
            name: '8WHIE IPv6 Proxy Manager',
            developer: 'Aryan Thakur',
            version: '1.0.0',
            log_level: 'INFO',
            log_file: '/var/log/8whie-proxy/manager.log',
            pid_file: '/run/8whie-proxy/manager.pid',
            listen_host: '::',
          },
          proxies: proxies.map(p => ({
            id: p.id,
            type: p.type,
            port: p.port,
            ipv6_address: p.ipv6Address,
            username: p.username,
            password_hash: p.passwordHash,
            enabled: p.enabled,
            max_connections: p.maxConnections,
            timeout_seconds: p.timeoutSeconds,
            description: p.description,
          })),
        };

        rootFolder.file('config/proxy_config.json', JSON.stringify(currentConfig, null, 2));

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '8whie-ipv6-proxy.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addLog('SECURITY', 'Generated and exported full standalone 8whie-ipv6-proxy.zip production bundle.');
      }
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const runningCount = proxies.filter(p => p.status === 'running').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadZip={handleDownloadZip}
        isDownloading={isDownloading}
        totalProxies={proxies.length}
        runningProxies={runningCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'architecture' && <ArchitectureView />}

        {activeTab === 'discovery' && (
          <DiscoveryStudio
            addresses={addresses}
            onScan={handleScan}
            isScanning={isScanning}
            onSelectIpForProxy={handleSelectIpForProxy}
            onAddManualIp={handleAddManualIp}
          />
        )}

        {activeTab === 'proxies' && (
          <ProxyManager
            proxies={proxies}
            availableIps={addresses.filter(a => a.isGlobal)}
            onAddProxy={handleAddProxy}
            onStartProxy={handleStartProxy}
            onStopProxy={handleStopProxy}
            onRestartProxy={handleRestartProxy}
            onDeleteProxy={handleDeleteProxy}
            onStartAll={handleStartAll}
            onStopAll={handleStopAll}
            preselectedIp={preselectedIp}
          />
        )}

        {activeTab === 'terminal' && (
          <CliTerminal
            proxies={proxies}
            addresses={addresses}
            onStartProxy={handleStartProxy}
            onStopProxy={handleStopProxy}
            onRestartProxy={handleRestartProxy}
            onDeleteProxy={handleDeleteProxy}
            onAddProxy={handleAddProxy}
            onScan={handleScan}
          />
        )}

        {activeTab === 'diagnostics' && <DiagnosticTester proxies={proxies} />}

        {activeTab === 'logs' && (
          <LogsViewer
            logs={logs}
            onClearLogs={() => setLogs([])}
          />
        )}

        {activeTab === 'files' && (
          <RepoExplorer
            onDownloadZip={handleDownloadZip}
            isDownloading={isDownloading}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-400">8WHIE IPv6 Proxy Manager</span>
            <span>•</span>
            <span>Developed by Aryan Thakur</span>
            <span>•</span>
            <span>Brand: 8WHIE</span>
          </div>
          <div>
            <span>Licensed under Apache-2.0 • Self-Hosted Linux IPv6 Multi-Proxy Server</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
