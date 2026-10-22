export interface EmployeeInfo {
  name: string;
  number: string;
  designation: string;
  company: string;
}

export interface ContractRecord {
  employeeNum: string;
  normalizedId: string;
  contractualDays: number; // 5, 5.5, 6, 7
  department?: string;
}

export interface DailyRecord {
  date: string;           // "20-Apr"
  dayNum: number;         // 1..31
  dayOfWeek: string;      // "Monday"
  isoWeek: number;        // ISO 8601 week number
  isoYear: number;
  code: string;           // "W", "WHF", "WHH", "H", "HD", "CO", "S", "L", "U", "OFF"
  workValue: number;      // 1.0, 0.5, 0.0
  expectedValue: number;  // 1.0, 0.5, 0.0
  isLeave: boolean;
}

export interface ExtractedTimesheetRow {
  serial: number;
  employeeNum: string;
  normalizedId: string;
  employeeName: string;
  designation: string;
  company: string;
  dates: Record<string, string>; // e.g. "20-Apr": "W"
  rawDayCodes: Record<number, string>; // e.g. 20: "W"
  extractionSource?: 'vector-pdf' | 'wasm-ocr' | 'doc-ai';
  warnings?: string[];
}

export interface CompOffRecord {
  employeeNum: string;
  employeeName: string;
  designation: string;
  company: string;
  contractualDays: number | string;
  compOffEarned: number;
  weeklyBreakdown?: Record<string, { actual: number; expected: number; excess: number }>;
}

export interface LeaveRecord {
  employeeNum: string;
  employeeName: string;
  designation: string;
  company: string;
  contractualDays: number | string;
  totalLeaveDays: number;
  leaveDaysDates: string;
  compOffEarned: number;
  leaveBreakdown?: Record<string, number>;
}

export interface AnalyticsSummary {
  totalEmployees: number;
  totalCompOffDays: number;
  totalLeaveDays: number;
  unplannedLeaveRate: number; // percentage
  missingContractsCount: number;
  attendanceDistribution: Record<string, number>;
}

export interface ExtractionProviderConfig {
  activeProvider: 'vector-pdf' | 'wasm-ocr' | 'doc-ai';
  enableOcrFallback: boolean;
  enableDocAiFallback: boolean;
  apiKeys: {
    geminiApiKey?: string;
    customEndpointUrl?: string;
  };
}

export interface HistoricalBatch {
  id: string;
  title: string;
  timestamp: number;
  startDate: string;
  endDate: string;
  rowsCount: number;
  rows: ExtractedTimesheetRow[];
  contracts: ContractRecord[];
}
