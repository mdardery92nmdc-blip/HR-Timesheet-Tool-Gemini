import * as XLSX from 'xlsx';
import { ContractRecord } from '../types';
import { normalizeId } from './attendanceAnalysis';

export interface ParseContractResult {
  contracts: ContractRecord[];
  error?: string;
  count: number;
}

export async function parseContractFile(file: File): Promise<ParseContractResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { contracts: [], count: 0, error: 'Uploaded contract workbook contains no sheets.' };
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return { contracts: [], count: 0, error: 'Contract file is empty.' };
    }

    // Inspect headers
    const sample = rawRows[0];
    const keys = Object.keys(sample);

    // Look for Employee # column
    const empKey = keys.find(k => {
      const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean.includes('employee') || clean.includes('emp') || clean === 'empid' || clean === 'id';
    });

    // Look for Contractual Days column
    const daysKey = keys.find(k => {
      const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean.includes('contractual') || (clean.includes('contract') && clean.includes('day')) || clean.includes('daysperweek');
    });

    if (!empKey || !daysKey) {
      return {
        contracts: [],
        count: 0,
        error: "Contract file must have 'Employee #' and 'Contractual Days Per Week' columns."
      };
    }

    const contracts: ContractRecord[] = [];
    for (const r of rawRows) {
      const empRaw = r[empKey];
      const daysRaw = r[daysKey];
      if (empRaw === undefined || empRaw === null || String(empRaw).trim() === '') continue;

      const empNum = String(empRaw).trim();
      const normId = normalizeId(empNum);
      const parsedDays = parseFloat(String(daysRaw));
      const days = isNaN(parsedDays) ? 5.5 : parsedDays;

      contracts.push({
        employeeNum: empNum,
        normalizedId: normId,
        contractualDays: days
      });
    }

    return {
      contracts,
      count: contracts.length
    };
  } catch (err: any) {
    return {
      contracts: [],
      count: 0,
      error: `Error loading contract file: ${err?.message || String(err)}`
    };
  }
}
