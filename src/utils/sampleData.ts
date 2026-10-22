import { ContractRecord, ExtractedTimesheetRow } from '../types';
import { formatDateCol, normalizeId } from './attendanceAnalysis';

export const SAMPLE_CONTRACT_CSV = `Employee #,Contractual Days Per Week
005000,5.5
005001,6.0
005002,5.5
005003,6.0
005004,7.0`;

export const SAMPLE_CONTRACTS: ContractRecord[] = [
  { employeeNum: '005000', normalizedId: '5000', contractualDays: 5.5 },
  { employeeNum: '005001', normalizedId: '5001', contractualDays: 6.0 },
  { employeeNum: '005002', normalizedId: '5002', contractualDays: 5.5 },
  { employeeNum: '005003', normalizedId: '5003', contractualDays: 6.0 },
  { employeeNum: '005004', normalizedId: '5004', contractualDays: 7.0 },
];

export function getSampleTimesheetRows(dateList: Date[]): ExtractedTimesheetRow[] {
  const sampleEmployees = [
    { num: '005000', name: 'Ahmed El-Sayed', des: 'Senior Project Engineer', com: 'NMDC Dredging' },
    { num: '005001', name: 'Fatima Al-Mansouri', des: 'Marine Operations Supervisor', com: 'NMDC Marine' },
    { num: '005002', name: 'Tariq Al-Hashimi', des: 'Site QA/QC Inspector', com: 'NMDC Energy' },
    { num: '005003', name: 'Rashid Khan', des: 'Mechanical Maintenance Tech', com: 'NMDC Fleet' },
    { num: '005004', name: 'Carlos Mendez', des: 'Offshore Safety Officer', com: 'NMDC Offshore' },
    { num: '005099', name: 'Zaid Al-Ali (Contract Pending)', des: 'Consultant Specialist', com: 'NMDC HQ' },
  ];

  const results: ExtractedTimesheetRow[] = [];

  sampleEmployees.forEach((emp, empIdx) => {
    const dates: Record<string, string> = {};
    const rawDayCodes: Record<number, string> = {};

    dateList.forEach((dt) => {
      const colName = formatDateCol(dt);
      const dayNum = dt.getDate();
      const dayOfWeek = dt.getDay(); // 0 is Sunday, 6 is Saturday

      let code = 'W';

      // Realistic patterns:
      if (empIdx === 0) {
        // 5.5 day worker: works Mon-Sat, Sunday OFF, but worked two Sundays (extra comp-off!) and took 1 sick leave
        if (dayOfWeek === 0) {
          code = (dayNum === 24 || dayNum === 7) ? 'W' : 'OFF';
        } else if (dayOfWeek === 6) {
          code = 'WHH'; // half day
        } else if (dayNum === 28) {
          code = 'S'; // sick leave
        } else {
          code = 'W';
        }
      } else if (empIdx === 1) {
        // 6 day worker: works Mon-Sat, Sunday OFF, had 1 holiday worked, 1 leave
        if (dayOfWeek === 0) {
          code = (dayNum === 31) ? 'W' : 'OFF';
        } else if (dayNum === 5) {
          code = 'L'; // leave
        } else if (dayNum === 12) {
          code = 'WHF'; // work from home
        } else {
          code = 'W';
        }
      } else if (empIdx === 2) {
        // 5.5 day worker: took leave and unpaid
        if (dayOfWeek === 0) {
          code = 'OFF';
        } else if (dayOfWeek === 6) {
          code = 'WHH';
        } else if (dayNum === 22) {
          code = 'L';
        } else if (dayNum === 23) {
          code = 'U';
        } else {
          code = 'W';
        }
      } else if (empIdx === 3) {
        // 6 day worker: worked extra Sundays
        if (dayOfWeek === 0) {
          code = (dayNum === 24 || dayNum === 1) ? 'W' : 'OFF';
        } else {
          code = 'W';
        }
      } else if (empIdx === 4) {
        // 7 day worker: offshore
        if (dayNum % 14 === 0) {
          code = 'OFF';
        } else {
          code = 'W';
        }
      } else {
        // Missing contract worker
        if (dayOfWeek === 0) code = 'OFF';
        else code = 'W';
      }

      dates[colName] = code;
      rawDayCodes[dayNum] = code;
    });

    results.push({
      serial: empIdx + 1,
      employeeNum: emp.num,
      normalizedId: normalizeId(emp.num),
      employeeName: emp.name,
      designation: emp.des,
      company: emp.com,
      dates,
      rawDayCodes
    });
  });

  return results;
}
