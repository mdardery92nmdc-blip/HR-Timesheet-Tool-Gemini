import React from 'react';
import { AnalyticsSummary, ExtractedTimesheetRow } from '../types';
import { Users, Clock, CalendarDays, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface DashboardAnalyticsProps {
  analytics: AnalyticsSummary;
  periodLabel: string;
  missingContracts: string[];
  extractedRows: ExtractedTimesheetRow[];
  onSwitchToRoster: () => void;
  onSwitchToCompOff: () => void;
  onSwitchToLeave: () => void;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  analytics,
  periodLabel,
  missingContracts,
  extractedRows,
  onSwitchToRoster,
  onSwitchToCompOff,
  onSwitchToLeave
}) => {
  const dist = analytics.attendanceDistribution;
  const totalCodesCount = Object.values(dist).reduce((a, b) => a + b, 0);

  const getPercentage = (count: number) => {
    if (totalCodesCount === 0) return 0;
    return Math.round((count / totalCodesCount) * 1000) / 10;
  };

  const workDays = (dist['W'] || 0) + (dist['WHF'] || 0) + (dist['WHH'] || 0);
  const leaveDays = (dist['L'] || 0) + (dist['S'] || 0) + (dist['U'] || 0);
  const offDays = (dist['OFF'] || 0);
  const holidayDays = (dist['H'] || 0) + (dist['HD'] || 0) + (dist['CO'] || 0);

  return (
    <div className="space-y-6">
      {/* Period header and breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Workforce Dashboard</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Cycle: {periodLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{extractedRows.length} Timesheets Processed</span>
            <span aria-hidden="true">·</span>
            <span>ISO-8601 Compliance Active</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Workforce */}
        <div
          onClick={onSwitchToRoster}
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Workforce</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900">{analytics.totalEmployees}</div>
            <p className="text-xs text-slate-500 mt-1">Employees in cycle</p>
          </div>
        </div>

        {/* Card 2: Comp-Off Liability */}
        <div
          onClick={onSwitchToCompOff}
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Comp-Off Liability</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono tabular-nums text-amber-700">{analytics.totalCompOffDays}</div>
            <p className="text-xs text-slate-500 mt-1">Total excess days earned</p>
          </div>
        </div>

        {/* Card 3: Unplanned Leave Rate */}
        <div
          onClick={onSwitchToLeave}
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Leave Volume</span>
            <CalendarDays className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tabular-nums text-rose-700">{analytics.totalLeaveDays}</span>
              <span className="text-xs text-rose-600 font-semibold font-mono">({analytics.unplannedLeaveRate}%)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Recorded absence days</p>
          </div>
        </div>

        {/* Card 4: Contract Reconciliation */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contract Coverage</span>
            {analytics.missingContractsCount > 0 ? (
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
                {analytics.totalEmployees - analytics.missingContractsCount} / {analytics.totalEmployees}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {analytics.missingContractsCount === 0
                ? 'All contracts reconciled'
                : `${analytics.missingContractsCount} missing contract terms`}
            </p>
          </div>
        </div>
      </div>

      {/* Missing contract banner if applicable */}
      {missingContracts.length > 0 && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Contract reconciliation needed for:</span>{' '}
            <span className="font-mono text-amber-800">{missingContracts.join(', ')}</span>. Defaulting calculation to 0 comp-off until verified.
          </div>
        </div>
      )}

      {/* Attendance Distribution Visual Metric */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Attendance Code Distribution</h3>
          <div className="text-xs text-slate-500 font-mono tabular-nums">
            {totalCodesCount} total day slots logged
          </div>
        </div>

        {/* Multi-segment distribution bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
          <div
            style={{ width: `${getPercentage(workDays)}%` }}
            className="bg-blue-600 h-full transition-all"
            title={`Work Days: ${workDays} (${getPercentage(workDays)}%)`}
          />
          <div
            style={{ width: `${getPercentage(holidayDays)}%` }}
            className="bg-emerald-500 h-full transition-all"
            title={`Holidays & Comp: ${holidayDays} (${getPercentage(holidayDays)}%)`}
          />
          <div
            style={{ width: `${getPercentage(leaveDays)}%` }}
            className="bg-rose-500 h-full transition-all"
            title={`Leaves: ${leaveDays} (${getPercentage(leaveDays)}%)`}
          />
          <div
            style={{ width: `${getPercentage(offDays)}%` }}
            className="bg-slate-300 h-full transition-all"
            title={`Roster Off: ${offDays} (${getPercentage(offDays)}%)`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 shrink-0" />
            <span className="text-slate-600">Work (W, WHF, WHH):</span>
            <span className="font-mono font-semibold text-slate-900 ml-auto tabular-nums">{workDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
            <span className="text-slate-600">Holidays/CO (H, HD, CO):</span>
            <span className="font-mono font-semibold text-slate-900 ml-auto tabular-nums">{holidayDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />
            <span className="text-slate-600">Leaves (L, S, U):</span>
            <span className="font-mono font-semibold text-slate-900 ml-auto tabular-nums">{leaveDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 shrink-0" />
            <span className="text-slate-600">Rostered Off:</span>
            <span className="font-mono font-semibold text-slate-900 ml-auto tabular-nums">{offDays}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
