import {
  CompOffRecord,
  LeaveRecord,
  ExtractedTimesheetRow,
  ContractRecord,
  AnalyticsSummary
} from '../types';

// Mapping of attendance codes to work value (fraction of day)
export const CODE_WORK_VALUES: Record<string, number> = {
  'W': 1.0,
  'WHF': 1.0,
  'WHH': 0.5,
  'H': 1.0,
  'HD': 0.5,
  'CO': 0.0,
  'S': 0.0,
  'L': 0.0,
  'U': 0.0,
  'OFF': 0.0
};

export function normalizeId(empId: any): string {
  if (empId === null || empId === undefined) return '';
  const str = String(empId).trim();
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? str : String(parsed);
}

export function expectedWorkValue(weekday: string, contractualDays: number): number {
  if (contractualDays === 5.5) {
    if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(weekday)) {
      return 1.0;
    }
    if (weekday === 'Saturday') {
      return 0.5;
    }
    return 0.0;
  } else if (contractualDays === 6) {
    if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(weekday)) {
      return 1.0;
    }
    return 0.0;
  }
  return 1.0; // 7 days contract
}

export function getIsoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}

export function generateDateList(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const curr = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function formatDateCol(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[date.getMonth()];
  return `${day}-${month}`;
}

export function formatWeekday(date: Date): string {
  return WEEKDAYS[date.getDay()];
}

export interface AnalysisOutput {
  compReport: CompOffRecord[];
  leaveReport: LeaveRecord[];
  missingContracts: string[];
  analytics: AnalyticsSummary;
}

export function calculateCompOffAndLeave(
  dfWide: ExtractedTimesheetRow[],
  contracts: ContractRecord[],
  dateList: Date[],
  leaveCodes: string[] = ['L', 'S', 'U']
): AnalysisOutput {
  const upperLeaveCodes = new Set(leaveCodes.map(c => c.trim().toUpperCase()));

  const contractMap = new Map<string, number>();
  contracts.forEach(c => {
    contractMap.set(c.normalizedId, c.contractualDays);
  });

  const validCols = dateList.map(dt => formatDateCol(dt));
  const weekdayMap = new Map<string, string>();
  const datetimeMap = new Map<string, Date>();

  dateList.forEach(dt => {
    const colName = formatDateCol(dt);
    weekdayMap.set(colName, formatWeekday(dt));
    datetimeMap.set(colName, dt);
  });

  const compRecords: CompOffRecord[] = [];
  const leaveRecords: LeaveRecord[] = [];
  const missingContractsSet = new Set<string>();

  let grandTotalCompDays = 0;
  let grandTotalLeaveDays = 0;
  let totalScheduledWorkDays = 0;
  const attendanceDistribution: Record<string, number> = {
    'W': 0, 'WHF': 0, 'WHH': 0, 'H': 0, 'HD': 0, 'CO': 0, 'S': 0, 'L': 0, 'U': 0, 'OFF': 0
  };

  for (const row of dfWide) {
    const empId = normalizeId(row.employeeNum);
    const empName = row.employeeName || '';
    const designation = row.designation || '';
    const company = row.company || '';

    const contractual = contractMap.get(empId);

    if (contractual === undefined) {
      missingContractsSet.add(empId);
      leaveRecords.push({
        employeeNum: row.employeeNum,
        employeeName: empName,
        designation: designation,
        company: company,
        contractualDays: 'Unknown',
        totalLeaveDays: 0,
        leaveDaysDates: 'None',
        compOffEarned: 0
      });
      continue;
    }

    const weeklyActual: Record<string, number> = {};
    const weeklyExpected: Record<string, number> = {};
    const leaveDays: string[] = [];
    const leaveBreakdown: Record<string, number> = {};

    for (const colName of validCols) {
      const code = String(row.dates[colName] || '').toUpperCase().trim();
      if (code) {
        attendanceDistribution[code] = (attendanceDistribution[code] || 0) + 1;
      }

      const actual = CODE_WORK_VALUES[code] !== undefined ? CODE_WORK_VALUES[code] : 0.0;
      const weekday = weekdayMap.get(colName) || 'Monday';
      const expected = expectedWorkValue(weekday, contractual);

      if (expected > 0) {
        totalScheduledWorkDays += 1;
      }

      if (upperLeaveCodes.has(code)) {
        leaveDays.push(colName);
        leaveBreakdown[code] = (leaveBreakdown[code] || 0) + 1;
      }

      const dt = datetimeMap.get(colName);
      if (!dt) continue;

      const { year, week } = getIsoWeek(dt);
      const weekKey = `${year}-W${String(week).padStart(2, '0')}`;

      weeklyActual[weekKey] = (weeklyActual[weekKey] || 0.0) + actual;
      weeklyExpected[weekKey] = (weeklyExpected[weekKey] || 0.0) + expected;
    }

    // Weekly Excess Calculation
    let totalComp = 0;
    const weeklyBreakdown: Record<string, { actual: number; expected: number; excess: number }> = {};

    for (const [weekKey, actual] of Object.entries(weeklyActual)) {
      const exp = weeklyExpected[weekKey] || 0;
      const excess = Math.max(0, actual - exp);
      weeklyBreakdown[weekKey] = {
        actual: Math.round(actual * 10) / 10,
        expected: Math.round(exp * 10) / 10,
        excess: Math.round(excess * 10) / 10
      };
      if (excess > 0) {
        totalComp += excess;
      }
    }
    totalComp = Math.round(totalComp * 10) / 10;
    grandTotalCompDays += totalComp;
    grandTotalLeaveDays += leaveDays.length;

    if (totalComp > 0) {
      compRecords.push({
        employeeNum: row.employeeNum,
        employeeName: empName,
        designation: designation,
        company: company,
        contractualDays: contractual,
        compOffEarned: totalComp,
        weeklyBreakdown
      });
    }

    leaveRecords.push({
      employeeNum: row.employeeNum,
      employeeName: empName,
      designation: designation,
      company: company,
      contractualDays: contractual,
      totalLeaveDays: leaveDays.length,
      leaveDaysDates: leaveDays.length > 0 ? leaveDays.join(', ') : 'None',
      compOffEarned: totalComp,
      leaveBreakdown
    });
  }

  // Sort
  compRecords.sort((a, b) => b.compOffEarned - a.compOffEarned);
  leaveRecords.sort((a, b) => b.totalLeaveDays - a.totalLeaveDays);

  const unplannedLeaveRate = totalScheduledWorkDays > 0
    ? Math.round((grandTotalLeaveDays / totalScheduledWorkDays) * 1000) / 10
    : 0;

  return {
    compReport: compRecords,
    leaveReport: leaveRecords,
    missingContracts: Array.from(missingContractsSet),
    analytics: {
      totalEmployees: dfWide.length,
      totalCompOffDays: Math.round(grandTotalCompDays * 10) / 10,
      totalLeaveDays: grandTotalLeaveDays,
      unplannedLeaveRate,
      missingContractsCount: missingContractsSet.size,
      attendanceDistribution
    }
  };
}
