import * as XLSX from 'xlsx';
import { ExtractedTimesheetRow, CompOffRecord, LeaveRecord } from '../types';

/**
 * Creates the exact styled wide Excel file matching the original app:
 * - Row 1: Header names (Serial #, Employee #, Employee Name, Designation, Company, dates...)
 * - Row 2: Weekdays (Monday, Tuesday...)
 * - Row 3+: Employee records
 * - Includes 'Timesheets' wide sheet, 'Comp-Off Report' sheet, and 'Leave Report' sheet
 * - Freeze panes and auto column widths
 * - 100% native browser compatible without Node Buffer / stream errors
 */
export async function createFormattedExcel(
  results: ExtractedTimesheetRow[],
  dayWeekdayMap: Record<string, string>,
  dateCols: string[],
  compRecords: CompOffRecord[] = [],
  leaveRecords: LeaveRecord[] = []
): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  // 1. Build Timesheets Sheet
  const baseHeaders = ['Serial #', 'Employee #', 'Employee Name', 'Designation', 'Company'];
  const allHeaders = [...baseHeaders, ...dateCols];

  // Row 2: Weekdays
  const weekdayRow = ['', '', '', '', '', ...dateCols.map(d => dayWeekdayMap[d] || '')];

  // Data rows
  const dataRows = results.map((row, idx) => [
    idx + 1,
    row.employeeNum,
    row.employeeName,
    row.designation,
    row.company,
    ...dateCols.map(d => row.dates[d] || '')
  ]);

  const aoa = [allHeaders, weekdayRow, ...dataRows];
  const wsTimesheets = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths
  const colWidths = allHeaders.map((h, i) => {
    let maxLen = h.length;
    if (i < 5) {
      dataRows.forEach(r => {
        const val = String(r[i] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
    }
    return { wch: 9 }; // Day columns
  });
  wsTimesheets['!cols'] = colWidths;

  // Freeze at column F (index 5) and row 2 (header + weekday)
  wsTimesheets['!freeze'] = {
    xSplit: 5,
    ySplit: 2,
    topLeftCell: 'F3',
    activePane: 'bottomRight',
    state: 'frozen'
  };

  XLSX.utils.book_append_sheet(wb, wsTimesheets, 'Timesheets');

  // 2. Build Comp-Off Report Sheet
  if (compRecords && compRecords.length > 0) {
    const compHeaders = [
      'Employee #',
      'Employee Name',
      'Designation',
      'Company',
      'Contractual Days/Week',
      'Comp-Off Earned (Days)'
    ];
    const compData = compRecords.map(r => [
      r.employeeNum,
      r.employeeName,
      r.designation,
      r.company,
      r.contractualDays,
      r.compOffEarned
    ]);
    const wsComp = XLSX.utils.aoa_to_sheet([compHeaders, ...compData]);
    wsComp['!cols'] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsComp, 'Comp-Off Report');
  }

  // 3. Build Leave Report Sheet
  if (leaveRecords && leaveRecords.length > 0) {
    const leaveHeaders = [
      'Employee #',
      'Employee Name',
      'Designation',
      'Company',
      'Contractual Days/Week',
      'Total Leave Days',
      'Leave Dates',
      'Comp-Off Earned (Days)'
    ];
    const leaveData = leaveRecords.map(r => [
      r.employeeNum,
      r.employeeName,
      r.designation,
      r.company,
      r.contractualDays,
      r.totalLeaveDays,
      r.leaveDaysDates,
      r.compOffEarned
    ]);
    const wsLeave = XLSX.utils.aoa_to_sheet([leaveHeaders, ...leaveData]);
    wsLeave['!cols'] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 30 },
      { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsLeave, 'Leave Report');
  }

  // Write binary array
  const wbOut = XLSX.write(wb, {
    bookType: 'xlsx',
    type: 'array'
  });

  return new Blob([wbOut], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Helper to download a Blob as a file in the browser
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data: Record<string, any>[], columns?: string[]): string {
  if (data.length === 0) return '';
  const cols = columns || Object.keys(data[0]);

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = cols.map(escapeCSV).join(',');
  const rows = data.map(item => cols.map(c => escapeCSV(item[c])).join(','));
  return [headerRow, ...rows].join('\n');
}

/**
 * Download Comp-Off Report CSV
 */
export function downloadCompOffCSV(records: CompOffRecord[], filename: string) {
  const formatted = records.map(r => ({
    'Employee #': r.employeeNum,
    'Employee Name': r.employeeName,
    'Designation': r.designation,
    'Company': r.company,
    'Contractual Days/Week': r.contractualDays,
    'Comp-Off Earned (Days)': r.compOffEarned
  }));
  const csv = convertToCSV(formatted, [
    'Employee #',
    'Employee Name',
    'Designation',
    'Company',
    'Contractual Days/Week',
    'Comp-Off Earned (Days)'
  ]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Download Leave Report CSV
 */
export function downloadLeaveCSV(records: LeaveRecord[], filename: string) {
  const formatted = records.map(r => ({
    'Employee #': r.employeeNum,
    'Employee Name': r.employeeName,
    'Designation': r.designation,
    'Company': r.company,
    'Contractual Days/Week': r.contractualDays,
    'Total Leave Days': r.totalLeaveDays,
    'Leave Days (Dates)': r.leaveDaysDates,
    'Comp-Off Earned (Days)': r.compOffEarned
  }));
  const csv = convertToCSV(formatted, [
    'Employee #',
    'Employee Name',
    'Designation',
    'Company',
    'Contractual Days/Week',
    'Total Leave Days',
    'Leave Days (Dates)',
    'Comp-Off Earned (Days)'
  ]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Download Raw Timesheet Wide CSV
 */
export function downloadWideCSV(results: ExtractedTimesheetRow[], dateCols: string[], filename: string) {
  const rows = results.map((r, idx) => {
    const rowObj: Record<string, any> = {
      'Serial #': idx + 1,
      'Employee #': r.employeeNum,
      'Employee Name': r.employeeName,
      'Designation': r.designation,
      'Company': r.company
    };
    for (const d of dateCols) {
      rowObj[d] = r.dates[d] || '';
    }
    return rowObj;
  });

  const columns = ['Serial #', 'Employee #', 'Employee Name', 'Designation', 'Company', ...dateCols];
  const csv = convertToCSV(rows, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}
