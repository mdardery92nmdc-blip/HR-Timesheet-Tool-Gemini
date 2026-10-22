import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { EmployeeInfo, ExtractionProviderConfig } from '../types';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface ExtractedPdfData {
  employeeInfo: EmployeeInfo;
  attendanceCodes: Record<number, string>;
  rawText: string;
  filename: string;
  warnings: string[];
  source?: 'vector-pdf' | 'wasm-ocr' | 'doc-ai';
}

/**
 * Direct single PDF extractor
 */
export async function extractDataFromPdf(file: File): Promise<ExtractedPdfData> {
  const warnings: string[] = [];
  const employeeInfo: EmployeeInfo = {
    name: 'Not Found',
    number: 'Not Found',
    designation: 'Not Found',
    company: 'Not Found'
  };
  const attendanceCodes: Record<number, string> = {};

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;

    if (pdf.numPages === 0) {
      throw new Error('PDF has no pages.');
    }

    // Process page 1 (timesheet summary page)
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();

    const items: any[] = [];
    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const x = item.transform ? item.transform[4] : 0;
      const y = item.transform ? item.transform[5] : 0;
      items.push({
        str: item.str,
        x,
        y,
        width: item.width || 0,
        height: item.height || 0
      });
    }

    // Sort items vertically top-to-bottom, then left-to-right
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    const rows: { y: number; items: any[]; text: string }[] = [];
    const Y_TOLERANCE = 4.0;

    for (const item of items) {
      const existingRow = rows.find(r => Math.abs(r.y - item.y) <= Y_TOLERANCE);
      if (existingRow) {
        existingRow.items.push(item);
      } else {
        rows.push({
          y: item.y,
          items: [item],
          text: ''
        });
      }
    }

    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);
      row.text = row.items.map(i => i.str.trim()).join(' ');
    }

    const fullText = rows.map(r => r.text).join('\n');

    // Regex extraction for Employee Info
    const STOP = '(?=\\s*(?:NUMBER|DESIGNATION|COMPANY|EMPLOYEE|\\n|$))';
    const nameMatch = fullText.match(new RegExp(`NAME\\s*[:\\s]+([^:\\n]+?)${STOP}`, 'i'));
    const numMatch = fullText.match(/NUMBER\s*[:\s]+(\d+)/i) || fullText.match(/EMP(?:LOYEE)?\s*(?:NO|ID|#)?\s*[:\s]+(\d+)/i);
    const desMatch = fullText.match(new RegExp(`DESIGNATION\\s*[:\\s]+([^:\\n]+?)${STOP}`, 'i'));
    const comMatch = fullText.match(new RegExp(`COMPANY\\s*[:\\s]+([^:\\n]+?)${STOP}`, 'i'));

    if (nameMatch && nameMatch[1]) employeeInfo.name = nameMatch[1].trim();
    if (numMatch && numMatch[1]) employeeInfo.number = numMatch[1].trim();
    if (desMatch && desMatch[1]) employeeInfo.designation = desMatch[1].trim();
    if (comMatch && comMatch[1]) employeeInfo.company = comMatch[1].trim();

    // Fallbacks
    if (employeeInfo.name === 'Not Found') {
      for (const row of rows) {
        const m = row.text.match(/Name\s*[:\-]\s*([A-Za-z\s.]+)/i);
        if (m) {
          employeeInfo.name = m[1].trim();
          break;
        }
      }
    }
    if (employeeInfo.number === 'Not Found') {
      for (const row of rows) {
        const m = row.text.match(/(?:Emp(?:loyee)?\s*(?:#|ID|No\.?)|Number)\s*[:\-]\s*(\d+)/i);
        if (m) {
          employeeInfo.number = m[1].trim();
          break;
        }
      }
    }

    // Extract Attendance Codes
    const attendanceRowIdx = rows.findIndex(r => r.text.toUpperCase().includes('ATTENDANCE'));
    const dayHeaderRow: { day: number; x: number }[] = [];

    if (attendanceRowIdx > 0) {
      const prevRow = rows[attendanceRowIdx - 1];
      for (const item of prevRow.items) {
        const d = parseInt(item.str.trim(), 10);
        if (!isNaN(d) && d >= 1 && d <= 31) {
          dayHeaderRow.push({ day: d, x: item.x });
        }
      }
    }

    if (dayHeaderRow.length >= 10 && attendanceRowIdx >= 0) {
      const attRow = rows[attendanceRowIdx];
      for (const header of dayHeaderRow) {
        let closestItem: any = null;
        let minDiff = 25;
        for (const itm of attRow.items) {
          if (itm.str.toUpperCase().includes('ATTENDANCE')) continue;
          const diff = Math.abs(itm.x - header.x);
          if (diff < minDiff) {
            minDiff = diff;
            closestItem = itm;
          }
        }
        if (closestItem) {
          attendanceCodes[header.day] = closestItem.str.trim().toUpperCase();
        }
      }
    }

    // Fallback: look for row with valid codes (W, WHF, WHH, H, HD, CO, S, L, U, OFF)
    if (Object.keys(attendanceCodes).length === 0) {
      const validCodes = ['W', 'WHF', 'WHH', 'H', 'HD', 'CO', 'S', 'L', 'U', 'OFF'];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const codeItems = row.items.filter(itm => validCodes.includes(itm.str.trim().toUpperCase()));
        if (codeItems.length >= 7) {
          codeItems.forEach((itm, idx) => {
            if (idx + 1 <= 31) {
              attendanceCodes[idx + 1] = itm.str.trim().toUpperCase();
            }
          });
          break;
        }
      }
    }

    return {
      employeeInfo,
      attendanceCodes,
      rawText: fullText,
      filename: file.name,
      warnings,
      source: 'vector-pdf'
    };
  } catch (err: any) {
    warnings.push(`Extraction error: ${err?.message || String(err)}`);
    return {
      employeeInfo,
      attendanceCodes,
      rawText: '',
      filename: file.name,
      warnings,
      source: 'vector-pdf'
    };
  }
}

/**
 * Batch extraction with non-blocking async chunking & progress reporting
 */
export async function extractBatchWithWorker(
  files: File[],
  onProgress: (percent: number, text: string) => void,
  _providerConfig?: ExtractionProviderConfig
): Promise<ExtractedPdfData[]> {
  const results: ExtractedPdfData[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const pct = Math.round(((i + 1) / total) * 100);
    onProgress(pct, `Extracting ${file.name} (${i + 1}/${total})...`);

    // Yield control to ensure UI and progress render
    await new Promise(r => setTimeout(r, 10));

    try {
      const res = await extractDataFromPdf(file);
      results.push(res);
    } catch (err: any) {
      results.push({
        employeeInfo: { name: 'Error', number: 'Error', designation: 'Error', company: 'Error' },
        attendanceCodes: {},
        rawText: '',
        filename: file.name,
        warnings: [err?.message || 'Failed to extract PDF'],
        source: 'vector-pdf'
      });
    }
  }

  onProgress(100, `Completed extraction of ${total} files.`);
  return results;
}
