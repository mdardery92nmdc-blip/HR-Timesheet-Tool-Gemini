import React, { useState } from 'react';
import { ExtractedTimesheetRow } from '../types';
import { Search, Edit2, Check, X } from 'lucide-react';

interface RosterWorkstationProps {
  rows: ExtractedTimesheetRow[];
  dateStrList: string[];
  dayWeekdayMap: Record<string, string>;
  onUpdateCellCode: (rowIndex: number, dateCol: string, newCode: string) => void;
}

const ATTENDANCE_OPTIONS = ['W', 'WHF', 'WHH', 'H', 'HD', 'CO', 'S', 'L', 'U', 'OFF'];

export const RosterWorkstation: React.FC<RosterWorkstationProps> = ({
  rows,
  dateStrList,
  dayWeekdayMap,
  onUpdateCellCode
}) => {
  const [search, setSearch] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; dateCol: string } | null>(null);
  const [selectedCode, setSelectedCode] = useState('');

  const filteredRows = rows.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.employeeNum.toLowerCase().includes(q) ||
      r.employeeName.toLowerCase().includes(q) ||
      r.designation.toLowerCase().includes(q) ||
      r.company.toLowerCase().includes(q)
    );
  });

  const getBadgeStyle = (code: string) => {
    const c = code.toUpperCase();
    switch (c) {
      case 'W':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'WHF':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'WHH':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'H':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'HD':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'CO':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
      case 'L':
      case 'S':
      case 'U':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      case 'OFF':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'text-slate-600 bg-white border-transparent';
    }
  };

  const handleStartEdit = (rowIndex: number, dateCol: string, currentCode: string) => {
    setEditingCell({ rowIndex, dateCol });
    setSelectedCode(currentCode || 'W');
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      onUpdateCellCode(editingCell.rowIndex, editingCell.dateCol, selectedCode);
      setEditingCell(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Roster Workstation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any attendance cell to adjust or correct day codes. Changes immediately re-audit comp-off excess.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name, badge #, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* High-density grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="min-w-full text-xs text-left divide-y divide-slate-200">
            <thead className="bg-slate-900 text-white font-semibold sticky top-0 z-10 shadow-xs">
              <tr>
                <th className="px-3 py-2.5 text-center whitespace-nowrap">#</th>
                <th className="px-3 py-2.5 whitespace-nowrap font-mono">Emp #</th>
                <th className="px-4 py-2.5 whitespace-nowrap">Employee Name</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Designation</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Company</th>
                {dateStrList.map((d) => (
                  <th key={d} className="px-2 py-2 text-center whitespace-nowrap border-l border-slate-700/60 font-mono">
                    <div>{d}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {dayWeekdayMap[d]?.slice(0, 3)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3 py-2 text-center font-mono text-slate-400">{row.serial}</td>
                  <td className="px-3 py-2 font-mono font-medium text-slate-900">{row.employeeNum}</td>
                  <td className="px-4 py-2 font-medium text-slate-900 whitespace-nowrap">{row.employeeName}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.designation}</td>
                  <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.company}</td>
                  {dateStrList.map((d) => {
                    const isEditing = editingCell?.rowIndex === rIdx && editingCell?.dateCol === d;
                    const val = row.dates[d] || '';

                    return (
                      <td
                        key={d}
                        onClick={() => !isEditing && handleStartEdit(rIdx, d, val)}
                        className={`px-1.5 py-1 text-center border-l border-slate-100 whitespace-nowrap cursor-pointer transition-colors ${
                          isEditing ? 'bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-blue-50/40'
                        }`}
                        title="Click to change code"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-center">
                            <select
                              value={selectedCode}
                              onChange={(e) => setSelectedCode(e.target.value)}
                              autoFocus
                              className="text-[11px] font-mono py-0.5 px-1 bg-white border border-blue-400 rounded"
                            >
                              {ATTENDANCE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit();
                              }}
                              className="p-0.5 text-emerald-600 hover:text-emerald-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCell(null);
                              }}
                              className="p-0.5 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : val ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono border ${getBadgeStyle(val)}`}>
                            {val}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
