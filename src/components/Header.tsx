import React from 'react';
import { ShieldCheck, Download, Terminal, RefreshCw, Cpu, Globe } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onDownloadZip: () => void;
  isDownloading: boolean;
  totalProxies: number;
  runningProxies: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onDownloadZip,
  isDownloading,
  totalProxies,
  runningProxies,
}) => {
  const tabs = [
    { id: 'architecture', label: 'Architecture & Design' },
    { id: 'discovery', label: 'IPv6 Discovery' },
    { id: 'proxies', label: 'Proxy Manager', count: totalProxies },
    { id: 'terminal', label: 'CLI Terminal' },
    { id: 'diagnostics', label: 'Self-Test Suite' },
    { id: 'logs', label: 'Security & Logs' },
    { id: 'files', label: 'Codebase & Export' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl tracking-tighter">
            8W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide">
                8WHIE IPv6 Proxy Manager
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Founder & Lead Developer: <span className="text-slate-200 font-medium">Aryan Thakur</span> • Brand: <span className="text-cyan-400 font-semibold">8WHIE</span>
            </p>
          </div>
        </div>

        {/* Live Metrics & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400">Daemon:</span>
              <span className="text-emerald-400 font-medium">Active</span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Active Proxies:</span>
              <span className="text-white font-mono font-bold">{runningProxies}/{totalProxies}</span>
            </div>
          </div>

          <button
            onClick={onDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-md shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
            title="Download full Linux Python codebase as ZIP"
          >
            {isDownloading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export 8whie-ipv6-proxy.zip</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-1 border-t border-slate-800/60 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 px-3.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
