import React, { useState } from 'react';
import { FileText, Shield, Search, Trash2, Download, AlertCircle, Info, Lock } from 'lucide-react';
import { SystemLogEntry } from '../types';

interface LogsViewerProps {
  logs: SystemLogEntry[];
  onClearLogs: () => void;
}

export const LogsViewer: React.FC<LogsViewerProps> = ({ logs, onClearLogs }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter((l) => {
    if (filterLevel !== 'ALL' && l.level !== filterLevel) return false;
    if (searchTerm && !l.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getLevelBadge = (level: SystemLogEntry['level']) => {
    switch (level) {
      case 'INFO':
        return <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 font-mono text-[10px]">INFO</span>;
      case 'WARN':
        return <span className="px-1.5 py-0.5 rounded bg-yellow-950 text-yellow-400 font-mono text-[10px]">WARN</span>;
      case 'ERROR':
        return <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 font-mono text-[10px]">ERROR</span>;
      case 'SECURITY':
        return <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px]">SECURITY</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Sanitized Security & Audit Logs</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time server log feed. In compliance with 8WHIE security guidelines, inbound credentials, authorization headers, and plaintext passwords are unconditionally scrubbed.
          </p>
        </div>

        <button
          onClick={onClearLogs}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-3 py-2 rounded-lg transition-colors border border-slate-700"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Logs</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Log Level:</span>
          {['ALL', 'INFO', 'SECURITY', 'WARN', 'ERROR'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterLevel === lvl
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search log messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Log Stream Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-y-auto max-h-[500px] space-y-1.5 leading-relaxed">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No matching log entries found.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2 hover:bg-slate-900/50 p-1.5 rounded transition-colors"
            >
              <span className="text-slate-500 shrink-0 text-[11px]">{log.timestamp}</span>
              <span className="shrink-0">{getLevelBadge(log.level)}</span>
              {log.proxyId && (
                <span className="text-cyan-400 shrink-0 font-bold">[{log.proxyId}]</span>
              )}
              <span className="text-slate-300 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
