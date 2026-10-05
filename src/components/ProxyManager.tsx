import React, { useState } from 'react';
import { Plus, Server, Play, Square, RotateCw, Trash2, Key, Shield, AlertCircle, CheckCircle2, Copy, Lock, Cpu, Eye, EyeOff } from 'lucide-react';
import { ManagedProxy, ProxyType, DiscoveredIPv6 } from '../types';

interface ProxyManagerProps {
  proxies: ManagedProxy[];
  availableIps: DiscoveredIPv6[];
  onAddProxy: (proxy: Omit<ManagedProxy, 'id' | 'status' | 'bytesIn' | 'bytesOut' | 'activeConnections' | 'createdAt'>) => { success: boolean; message: string };
  onStartProxy: (id: string) => void;
  onStopProxy: (id: string) => void;
  onRestartProxy: (id: string) => void;
  onDeleteProxy: (id: string) => void;
  onStartAll: () => void;
  onStopAll: () => void;
  preselectedIp?: string;
}

export const ProxyManager: React.FC<ProxyManagerProps> = ({
  proxies,
  availableIps,
  onAddProxy,
  onStartProxy,
  onStopProxy,
  onRestartProxy,
  onDeleteProxy,
  onStartAll,
  onStopAll,
  preselectedIp,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [proxyType, setProxyType] = useState<ProxyType>('http');
  const [port, setPort] = useState<number>(8080);
  const [selectedIp, setSelectedIp] = useState<string>(preselectedIp || (availableIps[0]?.address || '2001:db8::10'));
  const [username, setUsername] = useState('aryan_user');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [justGeneratedCreds, setJustGeneratedCreds] = useState<{ user: string; pass: string } | null>(null);

  // Generate strong random password
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_';
    let pwd = '';
    const array = new Uint8Array(18);
    crypto.getRandomValues(array);
    for (let i = 0; i < 18; i++) {
      pwd += chars[array[i] % chars.length];
    }
    setPassword(pwd);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let pwd = password;
    if (!pwd) {
      // Auto-generate if empty
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_';
      const array = new Uint8Array(18);
      crypto.getRandomValues(array);
      pwd = Array.from(array, byte => chars[byte % chars.length]).join('');
    }

    const res = onAddProxy({
      type: proxyType,
      port: Number(port),
      ipv6Address: selectedIp,
      username: username.trim(),
      password: pwd,
      passwordHash: `pbkdf2_sha256$mock$${btoa(pwd).substring(0, 16)}`,
      enabled: true,
      maxConnections: 500,
      timeoutSeconds: 60,
      description: description.trim() || `${proxyType.toUpperCase()} endpoint on ${selectedIp}`,
    });

    if (res.success) {
      setJustGeneratedCreds({ user: username, pass: pwd });
      setShowAddModal(false);
      // Reset form with next port suggestion
      setPort(prev => prev + 1);
      setPassword('');
      setDescription('');
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner and Quick Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Proxy Fleet Supervisor</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage authenticated HTTP (CONNECT) and SOCKS5 proxy endpoints. Each endpoint binds to a dedicated IPv6 address.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onStartAll}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Start All</span>
          </button>
          <button
            onClick={onStopAll}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-3 py-2 rounded-lg transition-colors border border-slate-700"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Stop All</span>
          </button>
          <button
            onClick={() => {
              if (availableIps.length > 0 && !preselectedIp) {
                setSelectedIp(availableIps[0].address);
              }
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-lg shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Proxy Endpoint</span>
          </button>
        </div>
      </div>

      {/* Generated Credential Notice (dismissible) */}
      {justGeneratedCreds && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-600/40 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Proxy Endpoint Created Successfully
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Save these credentials. Passwords are immediately salted & hashed; cleartext passwords are never saved in logs:
              </p>
              <div className="mt-2 flex flex-wrap gap-4 font-mono text-xs bg-slate-950 p-2.5 rounded border border-slate-800">
                <div>
                  <span className="text-slate-400">Username: </span>
                  <span className="text-cyan-300 font-bold">{justGeneratedCreds.user}</span>
                </div>
                <div>
                  <span className="text-slate-400">Password: </span>
                  <span className="text-emerald-300 font-bold">{justGeneratedCreds.pass}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setJustGeneratedCreds(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Proxy Endpoints List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Configured Proxy Endpoints ({proxies.length})</h3>
        </div>

        {proxies.length === 0 ? (
          <div className="text-center py-12 bg-slate-950 rounded-lg border border-slate-800">
            <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No proxies configured yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;New Proxy Endpoint&quot; to configure your first IPv6-bound HTTP or SOCKS5 proxy.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Port</th>
                  <th className="py-2.5 px-3">Bound IPv6 Address</th>
                  <th className="py-2.5 px-3">Authentication</th>
                  <th className="py-2.5 px-3">Active / Traffic</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {proxies.map((p) => {
                  const isRunning = p.status === 'running';
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                          <span className={`font-medium uppercase text-[11px] ${isRunning ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {p.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase text-[11px] ${
                          p.type === 'http'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {p.port}
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-300">
                        {p.ipv6Address}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        <div className="flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>{p.username}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        <div>{p.activeConnections} active</div>
                        <div className="text-[10px] text-slate-500">{(p.bytesIn / 1024).toFixed(1)} KB in / {(p.bytesOut / 1024).toFixed(1)} KB out</div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isRunning ? (
                            <>
                              <button
                                onClick={() => onStopProxy(p.id)}
                                title="Stop Proxy"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-yellow-400 rounded transition-colors"
                              >
                                <Square className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onRestartProxy(p.id)}
                                title="Restart Proxy"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded transition-colors"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => onStartProxy(p.id)}
                              title="Start Proxy"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded transition-colors"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteProxy(p.id)}
                            title="Delete Proxy"
                            className="p-1.5 bg-slate-800 hover:bg-red-950 text-red-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Proxy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Add New IPv6 Proxy Endpoint
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              {/* Protocol Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proxy Protocol Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProxyType('http')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                      proxyType === 'http'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    HTTP / CONNECT
                  </button>
                  <button
                    type="button"
                    onClick={() => setProxyType('socks5')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                      proxyType === 'socks5'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    SOCKS5 (RFC 1928)
                  </button>
                </div>
              </div>

              {/* Port & Bound IPv6 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Listening Port
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500">Prevent duplicate port collisions</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bound Outbound IPv6
                  </label>
                  {availableIps.length > 0 ? (
                    <select
                      value={selectedIp}
                      onChange={(e) => setSelectedIp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    >
                      {availableIps.map((ip) => (
                        <option key={ip.address} value={ip.address}>
                          {ip.address} ({ip.interface})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedIp}
                      onChange={(e) => setSelectedIp(e.target.value)}
                      placeholder="2001:db8::10"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  )}
                  <span className="text-[10px] text-slate-500">Egress socket will bind to this IPv6</span>
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      + Generate Strong
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave empty to auto-generate"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Purpose (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scraper worker 1 outbound egress"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-md shadow-cyan-600/20"
                >
                  Deploy Endpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
