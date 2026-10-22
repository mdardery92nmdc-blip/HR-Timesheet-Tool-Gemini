import React, { useState } from 'react';
import { CompOffRecord } from '../types';
import { Download, Search, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { downloadCompOffCSV } from '../utils/excelExporter';

interface CompOffLedgerProps {
  records: CompOffRecord[];
}

export const CompOffLedger: React.FC<CompOffLedgerProps> = ({ records }) => {
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (empNum: string) => {
    setExpandedRows(prev => ({ ...prev, [empNum]: !prev[empNum] }));
  };

  const filtered = records.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.employeeNum.toLowerCase().includes(q) ||
      r.employeeName.toLowerCase().includes(q) ||
      r.designation.toLowerCase().includes(q) ||
      r.company.toLowerCase().includes(q)
    );
  });

  const totalCompDays = records.reduce((sum, r) => sum + r.compOffEarned, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Comp-Off Ledger</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>{records.length} Employees with Comp-Off</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-semibold text-amber-700">{Math.round(totalCompDays * 10) / 10} Total Excess Days</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {records.length > 0 && (
            <button
              onClick={() =>
                downloadCompOffCSV(
                  records,
                  `CompOff_Report_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
          )}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <table className="min-w-full text-xs text-left divide-y divide-slate-200">
            <thead className="bg-slate-50 font-semibold text-slate-700">
              <tr>
                <th className="w-8 px-3 py-3"></th>
                <th className="px-4 py-3 font-mono">Employee #</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3 text-center font-mono">Contract Days/Wk</th>
                <th className="px-4 py-3 text-right font-mono text-amber-800">Comp-Off Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((r) => {
                const isExpanded = !!expandedRows[r.employeeNum];
                const weeks = r.weeklyBreakdown ? Object.entries(r.weeklyBreakdown) : [];

                return (
                  <React.Fragment key={r.employeeNum}>
                    <tr
                      onClick={() => toggleRow(r.employeeNum)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-3 text-center text-slate-400">
                        {weeks.length > 0 ? (
                          isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-900">{r.employeeNum}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.employeeName}</td>
                      <td className="px-4 py-3 text-slate-500">{r.designation}</td>
                      <td className="px-4 py-3 text-slate-500">{r.company}</td>
                      <td className="px-4 py-3 text-center font-mono">{r.contractualDays}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-amber-700 tabular-nums text-sm">
                        {r.compOffEarned}
                      </td>
                    </tr>

                    {/* Weekly Audit Inspection Subrow */}
                    {isExpanded && weeks.length > 0 && (
                      <tr className="bg-slate-50/70 border-b border-slate-200">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            ISO-8601 Weekly Excess Audit Breakdown:
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {weeks.map(([weekKey, details]) => (
                              <div
                                key={weekKey}
                                className={`p-2.5 rounded-lg border text-[11px] font-mono ${
                                  details.excess > 0
                                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                                    : 'bg-white border-slate-200 text-slate-600'
                                }`}
                              >
                                <div className="font-bold">{weekKey}</div>
                                <div className="mt-1 text-[10px] space-y-0.5">
                                  <div>Worked: {details.actual}d</div>
                                  <div>Target: {details.expected}d</div>
                                  <div className="font-semibold text-amber-800">
                                    Excess: +{details.excess}d
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
          No comp-off excess earned for this payroll cycle.
        </div>
      )}
    </div>
  );
};
