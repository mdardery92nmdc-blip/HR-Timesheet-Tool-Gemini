import React from 'react';
import { Sliders, History, Download, Sparkles } from 'lucide-react';

interface TopBarProps {
  activeTab: 'overview' | 'roster' | 'comp-off' | 'leave';
  setActiveTab: (tab: 'overview' | 'roster' | 'comp-off' | 'leave') => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onLoadDemo: () => void;
  hasData: boolean;
  onExportExcel: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenHistory,
  onLoadDemo,
  hasData,
  onExportExcel
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a href="/" className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2">
          <span className="text-xl">📊</span>
          <span>HR Timesheet Extractor Pro</span>
        </a>
      </div>

      {/* Zone 2: Clean single-line navigation links / tabs */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Analytics & Overview
        </button>
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'roster'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Roster Workstation
        </button>
        <button
          onClick={() => setActiveTab('comp-off')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'comp-off'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Comp-Off Ledger
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'leave'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Leave Audit
        </button>
      </nav>

      {/* Zone 3: Primary actions & configuration */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onLoadDemo}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Load Demo
        </button>

        <button
          onClick={onOpenHistory}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shrink-0"
          title="Saved Batches History"
          aria-label="Saved Batches History"
        >
          <History className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shrink-0"
          title="Provider & Fallback Settings"
          aria-label="Provider & Fallback Settings"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {hasData && (
          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
        )}
      </div>
    </header>
  );
};
