import React, { useState } from 'react';
import { LeaveRecord } from '../types';
import { Download, Search } from 'lucide-react';
import { downloadLeaveCSV } from '../utils/excelExporter';

interface LeaveAuditProps {
  records: LeaveRecord[];
}

export const LeaveAudit: React.FC<LeaveAuditProps> = ({ records }) => {
  const [search, setSearch] = useState('');

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

  const totalLeaveDays = records.reduce((sum, r) => sum + r.totalLeaveDays, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Leave Audit Ledger</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>{records.length} Employees Recorded</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-semibold text-rose-700">{totalLeaveDays} Total Absence Days</span>
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
                downloadLeaveCSV(
                  records,
                  `Leave_Report_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
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
                <th className="px-4 py-3 font-mono">Employee #</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3 text-center font-mono">Contract Days/Wk</th>
                <th className="px-4 py-3 text-center font-mono text-rose-800">Total Leave Days</th>
                <th className="px-4 py-3">Leave Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">{r.employeeNum}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.employeeName}</td>
                  <td className="px-4 py-3 text-slate-500">{r.designation}</td>
                  <td className="px-4 py-3 text-slate-500">{r.company}</td>
                  <td className="px-4 py-3 text-center font-mono">{r.contractualDays}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-rose-700 tabular-nums">
                    {r.totalLeaveDays}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 max-w-sm truncate" title={r.leaveDaysDates}>
                    {r.leaveDaysDates}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
          No leave records found for this period.
        </div>
      )}
    </div>
  );
};
