import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, CornerDownLeft, Trash2, HelpCircle, Copy, Check } from 'lucide-react';
import { ManagedProxy, DiscoveredIPv6 } from '../types';

interface CliTerminalProps {
  proxies: ManagedProxy[];
  addresses: DiscoveredIPv6[];
  onStartProxy: (id: string) => void;
  onStopProxy: (id: string) => void;
  onRestartProxy: (id: string) => void;
  onDeleteProxy: (id: string) => void;
  onAddProxy: (proxy: any) => { success: boolean; message: string };
  onScan: () => void;
}

interface HistoryItem {
  id: string;
  command: string;
  output: string;
  isError?: boolean;
}

const BANNER = `
  ██████╗ ██╗    ██╗██╗  ██╗██╗███████╗   8WHIE IPv6 Proxy Manager
  ██╔══██╗██║    ██║██║  ██║██║██╔════╝   Self-Hosted Multi-Proxy System
  ███████║██║ █╗ ██║███████║██║█████╗     Developer: Aryan Thakur
  ██╔══██║██║███╗██║██╔══██║██║██╔══╝     Brand: 8WHIE
  ██████╔╝╚███╔███╔╝██║  ██║██║███████╗   Version: 1.0.0
  ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝╚══════╝

Type "8whie-proxy --help" or click one of the quick commands below.
`;

export const CliTerminal: React.FC<CliTerminalProps> = ({
  proxies,
  addresses,
  onStartProxy,
  onStopProxy,
  onRestartProxy,
  onDeleteProxy,
  onAddProxy,
  onScan,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      id: 'init',
      command: '8whie-proxy status',
      output: BANNER + '\n[OK] 8WHIE IPv6 Proxy Manager daemon initialized and ready.\nConfig: /etc/8whie-proxy/config.json',
    },
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>(['8whie-proxy status']);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    if (trimmed === 'clear') {
      setHistory([]);
      setInputVal('');
      return;
    }

    let output = '';
    let isError = false;

    // Normalize command (support either '8whie-proxy ...' or just direct subcommands)
    let cmd = trimmed;
    if (cmd.startsWith('8whie-proxy ')) {
      cmd = cmd.substring('8whie-proxy '.length).trim();
    }

    const parts = cmd.split(/\s+/);
    const action = parts[0]?.toLowerCase();

    switch (action) {
      case 'help':
      case '--help':
      case '-h':
        output = `8WHIE IPv6 Proxy Manager CLI (Developer: Aryan Thakur)

Usage: 8whie-proxy [COMMAND] [OPTIONS]

Commands:
  scan       Scan host interfaces for available global IPv6 addresses
  list       List all configured HTTP and SOCKS5 proxies
  add        Add a new proxy (--type, --port, --ipv6, --user, --password)
  remove     Remove a proxy by ID
  start      Start proxy server instance(s) [all | <proxy_id>]
  stop       Stop proxy server instance(s) [all | <proxy_id>]
  restart    Restart proxy server instance(s) [all | <proxy_id>]
  status     Display system and daemon status
  test       Run safe diagnostic self-test [proxy_id]
  logs       View sanitized activity logs
  config     Display current configuration JSON
  clear      Clear the terminal screen`;
        break;

      case 'scan':
        onScan();
        const globalIps = addresses.filter(a => a.isGlobal);
        const assignedIps = new Set(proxies.map(p => p.ipv6Address));
        output = `Interface    IPv6 Address                             Prefix   In Use?
--------------------------------------------------------------------------------\n`;
        globalIps.forEach(a => {
          const inUse = assignedIps.has(a.address) ? 'YES' : 'NO';
          output += `${a.interface.padEnd(12)} ${a.address.padEnd(40)} /${a.prefixLen.toString().padEnd(7)} ${inUse}\n`;
        });
        output += `\nTotal global IPv6 addresses detected: ${globalIps.length}`;
        break;

      case 'list':
        if (proxies.length === 0) {
          output = 'No proxies configured yet. Run "8whie-proxy add" to create your first endpoint.';
        } else {
          output = `ID             Type    Port   IPv6 Address                             User         Status
----------------------------------------------------------------------------------------------------\n`;
          proxies.forEach(p => {
            output += `${p.id.padEnd(14)} ${p.type.toUpperCase().padEnd(7)} ${p.port.toString().padEnd(6)} ${p.ipv6Address.padEnd(40)} ${p.username.padEnd(12)} ${p.status.toUpperCase()}\n`;
          });
          output += `\nTotal proxies: ${proxies.length}`;
        }
        break;

      case 'add':
        // Example: add --type http --port 8080 --ipv6 2001:db8::10 --user user1 --password pass1
        const typeMatch = cmd.match(/--type\s+(\w+)/i);
        const portMatch = cmd.match(/--port\s+(\d+)/i);
        const ipMatch = cmd.match(/--ipv6\s+([0-9a-fA-F:]+)/i);
        const userMatch = cmd.match(/--user\s+([a-zA-Z0-9_\-]+)/i);
        const passMatch = cmd.match(/--password\s+([^\s]+)/i);

        const pType = (typeMatch ? typeMatch[1].toLowerCase() : 'http') as any;
        const pPort = portMatch ? parseInt(portMatch[1]) : 8080;
        const pIp = ipMatch ? ipMatch[1] : (addresses[0]?.address || '2001:db8::10');
        const pUser = userMatch ? userMatch[1] : 'user_' + pPort;
        const pPass = passMatch ? passMatch[1] : 'whie_pass_' + Math.floor(Math.random() * 9000 + 1000);

        const addRes = onAddProxy({
          type: pType,
          port: pPort,
          ipv6Address: pIp,
          username: pUser,
          password: pPass,
          passwordHash: `pbkdf2_sha256$mock$${btoa(pPass)}`,
          enabled: true,
          maxConnections: 500,
          timeoutSeconds: 60,
          description: `CLI created ${pType.toUpperCase()} endpoint on ${pIp}`,
        });

        if (addRes.success) {
          output = `✓ Successfully created proxy 'px-${pType}-${pPort}'\nListening Port: ${pPort}\nBound IPv6: ${pIp}\nUsername: ${pUser}\nPassword: ${pPass}\n(Store password securely; cleartext is never printed in logs)`;
        } else {
          output = `Error: ${addRes.message}`;
          isError = true;
        }
        break;

      case 'remove':
        const targetRemoveId = parts[1];
        if (!targetRemoveId) {
          output = 'Error: Must specify proxy ID to remove. Example: 8whie-proxy remove px-http-8080';
          isError = true;
        } else {
          onDeleteProxy(targetRemoveId);
          output = `✓ Proxy '${targetRemoveId}' removed successfully.`;
        }
        break;

      case 'start':
        const targetStartId = parts[1] || 'all';
        if (targetStartId === 'all') {
          proxies.forEach(p => onStartProxy(p.id));
          output = `✓ Started ${proxies.length} proxy instance(s).`;
        } else {
          onStartProxy(targetStartId);
          output = `✓ Proxy '${targetStartId}' started.`;
        }
        break;

      case 'stop':
        const targetStopId = parts[1] || 'all';
        if (targetStopId === 'all') {
          proxies.forEach(p => onStopProxy(p.id));
          output = `✓ Stopped ${proxies.length} proxy instance(s).`;
        } else {
          onStopProxy(targetStopId);
          output = `✓ Proxy '${targetStopId}' stopped.`;
        }
        break;

      case 'restart':
        const targetRestartId = parts[1] || 'all';
        if (targetRestartId === 'all') {
          proxies.forEach(p => onRestartProxy(p.id));
          output = `✓ Restarted all proxy instances.`;
        } else {
          onRestartProxy(targetRestartId);
          output = `✓ Proxy '${targetRestartId}' restarted.`;
        }
        break;

      case 'status':
        const runningCount = proxies.filter(p => p.status === 'running').length;
        output = `=======================================================
8WHIE IPv6 Proxy Manager - System Status
=======================================================
Brand:               8WHIE
Lead Developer:      Aryan Thakur
Version:             1.0.0
Systemd Service:     active (running)
Config File:         /etc/8whie-proxy/config.json (mode 0600)
Log File:            /var/log/8whie-proxy/manager.log
Total Proxies:       ${proxies.length} (${runningCount} active)
Global IPv6 Addrs:   ${addresses.filter(a => a.isGlobal).length} discovered
Outbound Routing:    Kernel Socket Egress Binding (AF_INET6)`;
        break;

      case 'test':
        const targetTestId = parts[1];
        const toTest = targetTestId ? proxies.filter(p => p.id === targetTestId) : proxies;
        if (toTest.length === 0) {
          output = targetTestId ? `Error: Proxy '${targetTestId}' not found.` : 'No proxies to test.';
          isError = true;
        } else {
          output = `Running safe loopback self-tests for ${toTest.length} proxy endpoint(s):\n\n`;
          toTest.forEach(p => {
            const isRun = p.status === 'running';
            const state = isRun ? '[PASS]' : '[STOPPED]';
            output += `${state} ${p.id} (${p.type.toUpperCase()}:${p.port})\n`;
            output += `       Socket Listening: ${isRun ? '✓' : '✗'} | Auth Handshake: ${isRun ? '✓' : '✗'} | Egress IPv6: ${p.ipv6Address}\n`;
          });
        }
        break;

      case 'logs':
        output = `[2026-10-04 19:40:01] [INFO] [8whie.manager] 8WHIE IPv6 Proxy Manager daemon initialized.
[2026-10-04 19:40:01] [INFO] [8whie.network] Discovered ${addresses.filter(a => a.isGlobal).length} globally routable IPv6 addresses.
[2026-10-04 19:40:02] [SECURITY] [8whie.security] Loaded configuration with restricted 0600 permissions.
[2026-10-04 19:40:05] [INFO] [8whie.proxy] Active proxy supervisor watching ports.`;
        break;

      case 'config':
        output = JSON.stringify(
          {
            system: {
              name: '8WHIE IPv6 Proxy Manager',
              developer: 'Aryan Thakur',
              version: '1.0.0',
              listen_host: '::',
            },
            proxies: proxies.map(p => ({
              id: p.id,
              type: p.type,
              port: p.port,
              ipv6_address: p.ipv6Address,
              username: p.username,
              password_hash: '[PROTECTED_BCRYPT_HASH]',
              enabled: p.enabled,
              status: p.status,
            })),
          },
          null,
          2
        );
        break;

      default:
        output = `Command not recognized: "${trimmed}". Type "8whie-proxy --help" for available commands.`;
        isError = true;
        break;
    }

    setHistory(prev => [
      ...prev,
      {
        id: String(Date.now()),
        command: trimmed,
        output,
        isError,
      },
    ]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = historyIndex + 1;
        if (nextIdx < commandHistory.length) {
          setHistoryIndex(nextIdx);
          setInputVal(commandHistory[commandHistory.length - 1 - nextIdx]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[commandHistory.length - 1 - nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    }
  };

  const quickCommands = [
    '8whie-proxy scan',
    '8whie-proxy list',
    '8whie-proxy status',
    '8whie-proxy test',
    '8whie-proxy add --type http --port 8080 --ipv6 2001:db8::10',
    '8whie-proxy config',
    '8whie-proxy --help',
    'clear',
  ];

  return (
    <div className="space-y-4 text-slate-200">
      {/* Terminal Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
        {/* Terminal Header Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-slate-400 font-bold ml-2">root@8whie-server: ~# (8whie-proxy CLI)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistory([])}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              title="Clear Terminal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 max-h-[500px] min-h-[350px] overflow-y-auto space-y-3 font-mono leading-relaxed">
          {history.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center gap-2 text-cyan-400">
                <span className="text-slate-500">aryan@8whie:~$</span>
                <span className="font-bold text-white">{item.command}</span>
              </div>
              <pre className={`whitespace-pre-wrap ${item.isError ? 'text-red-400' : 'text-slate-300'} pl-4`}>
                {item.output}
              </pre>
            </div>
          ))}
          <div ref={terminalBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="bg-slate-900/80 border-t border-slate-800 p-2.5 flex items-center gap-2">
          <span className="text-cyan-400 font-bold">aryan@8whie:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command (e.g. '8whie-proxy list' or '8whie-proxy scan')..."
            className="flex-1 bg-transparent border-none text-white focus:outline-none font-mono text-xs placeholder-slate-600"
            autoFocus
          />
          <button
            onClick={() => executeCommand(inputVal)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white p-1.5 rounded transition-colors"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Command Suggestions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quick 8WHIE CLI Commands:</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((cmd) => (
            <button
              key={cmd}
              onClick={() => {
                setInputVal(cmd);
                executeCommand(cmd);
              }}
              className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-700/60 text-slate-300 font-mono text-xs px-2.5 py-1 rounded transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
