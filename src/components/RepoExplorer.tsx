import React, { useState } from 'react';
import { Folder, FileText, Code2, Download, Copy, Check, FileCheck, Layers, Terminal, Server, Shield } from 'lucide-react';
import { REPO_FILES, RepoFile } from '../data/repoFiles';
import { REPO_CONTENT_MAP } from '../data/fileContents';

interface RepoExplorerProps {
  onDownloadZip: () => void;
  isDownloading: boolean;
}

export const RepoExplorer: React.FC<RepoExplorerProps> = ({ onDownloadZip, isDownloading }) => {
  const [selectedFile, setSelectedFile] = useState<RepoFile>(REPO_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fileContent = REPO_CONTENT_MAP[selectedFile.path] || `// File: ${selectedFile.path}\n// Author: Aryan Thakur (8WHIE)`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFiles = REPO_FILES.filter((f) => {
    if (categoryFilter === 'all') return true;
    return f.category === categoryFilter;
  });

  const categories = [
    { id: 'all', label: 'All Files' },
    { id: 'core', label: 'Core & Network' },
    { id: 'servers', label: 'Proxy Servers' },
    { id: 'cli', label: 'CLI Binary' },
    { id: 'scripts', label: 'Linux Scripts' },
    { id: 'systemd', label: 'Systemd Unit' },
    { id: 'docker', label: 'Docker Suite' },
    { id: 'tests', label: 'Unit Tests' },
    { id: 'docs', label: 'Documentation' },
  ];

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Production Repository Codebase Explorer</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Inspect all complete, from-scratch source files generated for <strong className="text-white">8WHIE IPv6 Proxy Manager</strong> by Aryan Thakur. Download the entire directory archive as a deployable <code className="text-cyan-300">.zip</code>.
          </p>
        </div>

        <button
          onClick={onDownloadZip}
          disabled={isDownloading}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloading ? 'Building ZIP...' : 'Download Repository (.zip)'}</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 text-xs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              categoryFilter === cat.id
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Two Column Explorer: File List + Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* File List Column */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-cyan-400" />
              <span>Repository Tree ({filteredFiles.length})</span>
            </span>
          </div>
          <div className="divide-y divide-slate-800/60 max-h-[550px] overflow-y-auto">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-3 flex flex-col gap-0.5 transition-colors text-xs ${
                    isSelected
                      ? 'bg-cyan-950/40 border-l-4 border-cyan-400 text-white'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold">{file.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">{file.language}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 line-clamp-1">{file.description}</span>
                  <span className="text-[10px] text-slate-500 font-mono mt-0.5">{file.path}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Content Column */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              <span className="font-mono font-bold text-white">{selectedFile.path}</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded uppercase">
                {selectedFile.language}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          <div className="p-4 overflow-x-auto max-h-[550px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-300">
            <pre className="whitespace-pre-wrap">{fileContent}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
