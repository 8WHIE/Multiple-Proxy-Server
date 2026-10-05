import React, { useState } from 'react';
import { Search, Globe, CheckCircle2, AlertTriangle, XCircle, Plus, Network, Info, Server, RefreshCw } from 'lucide-react';
import { DiscoveredIPv6 } from '../types';

interface DiscoveryStudioProps {
  addresses: DiscoveredIPv6[];
  onScan: () => void;
  isScanning: boolean;
  onSelectIpForProxy: (ip: string) => void;
  onAddManualIp: (ip: string, iface: string) => { success: boolean; message: string };
}

export const DiscoveryStudio: React.FC<DiscoveryStudioProps> = ({
  addresses,
  onScan,
  isScanning,
  onSelectIpForProxy,
  onAddManualIp,
}) => {
  const [manualIp, setManualIp] = useState('');
  const [manualIface, setManualIface] = useState('eth0');
  const [manualFeedback, setManualFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    const res = onAddManualIp(manualIp.trim(), manualIface.trim());
    setManualFeedback(res);
    if (res.success) {
      setManualIp('');
    }
  };

  const globalAddresses = addresses.filter(a => a.isGlobal);
  const ignoredAddresses = addresses.filter(a => !a.isGlobal);

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">IPv6 Interface Discovery</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            8WHIE automatically scans Linux <code className="text-cyan-300">/proc/net/if_inet6</code> and system network adapters. It identifies globally routable unicast addresses and filters out unusable link-local or loopback ranges.
          </p>
        </div>

        <button
          onClick={onScan}
          disabled={isScanning}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-cyan-600/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning Interfaces...' : 'Rescan Interfaces'}</span>
        </button>
      </div>

      {/* Discovered Global IPv6 Addresses */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Available Global IPv6 Addresses ({globalAddresses.length})
            </h3>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
            Routable for Proxy Egress
          </span>
        </div>

        {globalAddresses.length === 0 ? (
          <div className="p-8 text-center bg-slate-950 rounded-lg border border-slate-800">
            <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No globally routable IPv6 addresses detected</p>
            <p className="text-xs text-slate-500 mt-1">
              Ensure your hosting provider has assigned an IPv6 subnet to your network adapter, or use the manual addition form below.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Interface</th>
                  <th className="py-2.5 px-3">IPv6 Address</th>
                  <th className="py-2.5 px-3">Prefix</th>
                  <th className="py-2.5 px-3">Current Assignment</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {globalAddresses.map((item) => (
                  <tr key={item.address} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-medium">
                        {item.interface}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-white">
                      {item.address}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono">
                      /{item.prefixLen}
                    </td>
                    <td className="py-3 px-3">
                      {item.inUseBy ? (
                        <span className="inline-flex items-center gap-1 text-yellow-400 font-medium bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-800/40">
                          <Server className="w-3 h-3" />
                          <span>Bound to {item.inUseBy}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-medium">
                          Available for Proxy
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectIpForProxy(item.address)}
                        className="bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-700/60 px-2.5 py-1 rounded text-xs transition-colors"
                      >
                        Deploy Proxy Here
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Configuration & Filtered Discard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Safe Manual Configuration Option */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Manual IPv6 Registration</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            If your server has an IPv6 subnet provisioned (such as a <code className="text-slate-200">/64</code> routed subnet) that has not yet been automatically detected, you can validate and register it manually:
          </p>

          <form onSubmit={handleAddManual} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                IPv6 Address (RFC 4291)
              </label>
              <input
                type="text"
                placeholder="2001:db8:8whie::10"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Network Interface
              </label>
              <input
                type="text"
                placeholder="eth0"
                value={manualIface}
                onChange={(e) => setManualIface(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {manualFeedback && (
              <div className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                manualFeedback.success
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  : 'bg-red-950/60 border border-red-800 text-red-300'
              }`}>
                {manualFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{manualFeedback.message}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2 rounded-lg transition-colors shadow-md shadow-cyan-600/20"
            >
              Validate & Register IPv6
            </button>
          </form>
        </div>

        {/* Filtered Out / Discarded Addresses */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-slate-400" />
            <h3 className="text-base font-bold text-white">
              Ignored & Filtered Addresses ({ignoredAddresses.length})
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            In compliance with RFC 4291, the 8WHIE engine strictly discards loopback, link-local, and multicast addresses to prevent routing loops and invalid socket binds:
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {ignoredAddresses.map((item) => (
              <div key={item.address} className="p-2.5 bg-slate-950 rounded border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-mono text-slate-300">{item.address}</span>
                  <span className="text-slate-500 font-mono text-[10px] ml-2">({item.interface})</span>
                  <p className="text-[11px] text-yellow-400 mt-0.5">{item.details}</p>
                </div>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] uppercase font-mono">
                  {item.scope}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
