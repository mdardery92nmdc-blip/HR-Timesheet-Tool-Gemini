import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  Download,
  Info
} from 'lucide-react';

import {
  ContractRecord,
  ExtractedTimesheetRow,
  CompOffRecord,
  LeaveRecord,
  AnalyticsSummary,
  ExtractionProviderConfig,
  HistoricalBatch
} from './types';

import {
  generateDateList,
  formatDateCol,
  formatWeekday,
  calculateCompOffAndLeave,
  normalizeId
} from './utils/attendanceAnalysis';

import { parseContractFile } from './utils/contractParser';
import { extractBatchWithWorker } from './utils/pdfExtractor';
import {
  createFormattedExcel,
  downloadBlob,
  downloadWideCSV,
  downloadCompOffCSV,
  downloadLeaveCSV
} from './utils/excelExporter';

import {
  SAMPLE_CONTRACT_CSV,
  SAMPLE_CONTRACTS,
  getSampleTimesheetRows
} from './utils/sampleData';

import {
  saveHistoricalBatch,
  saveCachedContracts,
  getCachedContracts,
  getSavedProviderConfig,
  saveProviderConfig
} from './utils/storage';

import { TopBar } from './components/TopBar';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { RosterWorkstation } from './components/RosterWorkstation';
import { CompOffLedger } from './components/CompOffLedger';
import { LeaveAudit } from './components/LeaveAudit';
import { ProviderSettingsModal } from './components/ProviderSettingsModal';
import { BatchHistoryModal } from './components/BatchHistoryModal';

function getDefaultDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const endDate = new Date(year, month, 19);
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const startDate = new Date(prevYear, prevMonth, 20);

  const formatIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    startStr: formatIso(startDate),
    endStr: formatIso(endDate)
  };
}

export default function App() {
  const defaultDates = useMemo(() => getDefaultDates(), []);

  // Configuration
  const [startDateStr, setStartDateStr] = useState<string>(defaultDates.startStr);
  const [endDateStr, setEndDateStr] = useState<string>(defaultDates.endStr);
  const [leaveCodesInput, setLeaveCodesInput] = useState<string>('L, S, U');

  // Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'comp-off' | 'leave'>('overview');

  // Contracts
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [contractMsg, setContractMsg] = useState<string | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);

  // Timesheets & Workers
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');

  // Results
  const [extractedRows, setExtractedRows] = useState<ExtractedTimesheetRow[]>([]);
  const [compReport, setCompReport] = useState<CompOffRecord[]>([]);
  const [leaveReport, setLeaveReport] = useState<LeaveRecord[]>([]);
  const [missingContracts, setMissingContracts] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isAnalyzed, setIsAnalyzed] = useState<boolean>(false);

  // Settings & Modals
  const [providerConfig, setProviderConfig] = useState<ExtractionProviderConfig>(getSavedProviderConfig());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSampleExpanderOpen, setIsSampleExpanderOpen] = useState(false);
  const [saveBatchNotice, setSaveBatchNotice] = useState<string | null>(null);

  const contractInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Load cached contracts on mount
  useEffect(() => {
    getCachedContracts().then((saved) => {
      if (saved && saved.length > 0) {
        setContracts(saved);
        setContractMsg(`Loaded ${saved.length} employee contracts (IndexedDB Cache)`);
      }
    });
  }, []);

  // Date array computation
  const dateList = useMemo(() => {
    try {
      const [sy, sm, sd] = startDateStr.split('-').map(Number);
      const [ey, em, ed] = endDateStr.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
      return generateDateList(start, end);
    } catch {
      return [];
    }
  }, [startDateStr, endDateStr]);

  const dateStrList = useMemo(() => dateList.map(dt => formatDateCol(dt)), [dateList]);

  const dayWeekdayMap = useMemo(() => {
    const map: Record<string, string> = {};
    dateList.forEach(dt => {
      map[formatDateCol(dt)] = formatWeekday(dt);
    });
    return map;
  }, [dateList]);

  const leaveCodes = useMemo(() => {
    return leaveCodesInput.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
  }, [leaveCodesInput]);

  const periodLabel = dateList.length > 0
    ? `${formatDateCol(dateList[0])} - ${formatDateCol(dateList[dateList.length - 1])}`
    : 'Custom Cycle';

  // Recalculate analysis when dates, contracts, or extracted rows mutate
  const recompute = (rows: ExtractedTimesheetRow[], contractList: ContractRecord[]) => {
    if (rows.length === 0) return;
    const output = calculateCompOffAndLeave(rows, contractList, dateList, leaveCodes);
    setCompReport(output.compReport);
    setLeaveReport(output.leaveReport);
    setMissingContracts(output.missingContracts);
    setAnalytics(output.analytics);
    setIsAnalyzed(true);
  };

  // Upload contracts
  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setContractError(null);
    setContractMsg(null);
    setContractFile(file);

    const result = await parseContractFile(file);
    if (result.error) {
      setContractError(result.error);
    } else {
      setContracts(result.contracts);
      setContractMsg(`Loaded ${result.count} employee contracts`);
      saveCachedContracts(result.contracts);
      if (extractedRows.length > 0) {
        recompute(extractedRows, result.contracts);
      }
    }
  };

  // Upload PDFs
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    setPdfFiles(prev => [...prev, ...newFiles]);
  };

  const removePdfFile = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllPdfs = () => {
    setPdfFiles([]);
  };

  // Run Web Worker Extraction
  const handleExtract = async () => {
    if (pdfFiles.length === 0 || contracts.length === 0) return;

    setIsProcessing(true);
    setProgressPercent(0);
    setProgressStatus('Initializing Web Worker...');

    try {
      const extractedList = await extractBatchWithWorker(
        pdfFiles,
        (percent, status) => {
          setProgressPercent(percent);
          setProgressStatus(status);
        },
        providerConfig
      );

      const rows: ExtractedTimesheetRow[] = extractedList.map((item, idx) => {
        const dateMap: Record<string, string> = {};
        for (const currentDt of dateList) {
          const colName = formatDateCol(currentDt);
          dateMap[colName] = item.attendanceCodes[currentDt.getDate()] || '';
        }
        return {
          serial: idx + 1,
          employeeNum: item.employeeInfo.number,
          normalizedId: normalizeId(item.employeeInfo.number),
          employeeName: item.employeeInfo.name,
          designation: item.employeeInfo.designation,
          company: item.employeeInfo.company,
          dates: dateMap,
          rawDayCodes: item.attendanceCodes,
          extractionSource: item.source || 'vector-pdf',
          warnings: item.warnings
        };
      });

      setExtractedRows(rows);
      recompute(rows, contracts);
      setActiveTab('overview');
    } catch (err: any) {
      alert(`Worker extraction error: ${err?.message || String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load Demo Data
  const handleLoadDemo = () => {
    setContracts(SAMPLE_CONTRACTS);
    setContractMsg(`Loaded ${SAMPLE_CONTRACTS.length} employee contracts (Demo sample)`);
    setContractError(null);

    const sampleRows = getSampleTimesheetRows(dateList);
    setExtractedRows(sampleRows);
    recompute(sampleRows, SAMPLE_CONTRACTS);
    setActiveTab('overview');
  };

  // Save current batch to IndexedDB
  const handleSaveBatchToHistory = async () => {
    if (extractedRows.length === 0) return;
    const batchId = `batch_${Date.now()}`;
    const batch: HistoricalBatch = {
      id: batchId,
      title: `Cycle ${periodLabel}`,
      timestamp: Date.now(),
      startDate: startDateStr,
      endDate: endDateStr,
      rowsCount: extractedRows.length,
      rows: extractedRows,
      contracts: contracts
    };
    await saveHistoricalBatch(batch);
    setSaveBatchNotice('Batch snapshot saved to IndexedDB local storage!');
    setTimeout(() => setSaveBatchNotice(null), 3000);
  };

  // Restore batch from history
  const handleRestoreBatch = (batch: HistoricalBatch) => {
    setStartDateStr(batch.startDate);
    setEndDateStr(batch.endDate);
    setContracts(batch.contracts);
    setExtractedRows(batch.rows);
    recompute(batch.rows, batch.contracts);
    setActiveTab('overview');
  };

  // Inline attendance cell edit
  const handleUpdateCellCode = (rowIndex: number, dateCol: string, newCode: string) => {
    setExtractedRows(prev => {
      const updated = [...prev];
      const targetRow = { ...updated[rowIndex] };
      targetRow.dates = { ...targetRow.dates, [dateCol]: newCode };
      updated[rowIndex] = targetRow;
      recompute(updated, contracts);
      return updated;
    });
  };

  // Exports
  const handleExportWideExcel = async () => {
    if (extractedRows.length === 0) return;
    try {
      const blob = await createFormattedExcel(
        extractedRows,
        dayWeekdayMap,
        dateStrList,
        compReport,
        leaveReport
      );
      downloadBlob(blob, `Timesheet_Wide_${startDateStr}_${endDateStr}.xlsx`);
    } catch (err: any) {
      console.error('Excel generation failed:', err);
      alert(`Could not generate Excel file: ${err?.message || String(err)}`);
    }
  };

  const handleExportWideCSV = () => {
    if (extractedRows.length === 0) return;
    downloadWideCSV(extractedRows, dateStrList, `Timesheet_Raw_${startDateStr}_${endDateStr}.csv`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Top Bar with strict 3-zone contract */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onLoadDemo={handleLoadDemo}
        hasData={isAnalyzed}
        onExportExcel={handleExportWideExcel}
      />

      {/* Main Container (1440px max width baseline) */}
      <main className="max-w-[1440px] w-full mx-auto p-4 md:p-8 space-y-6 flex-1">
        {/* Save notice */}
        {saveBatchNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveBatchNotice}</span>
          </div>
        )}

        {/* Ingestion & Period Control Dock */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          {/* Top Bar: Dates & Leave Codes */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>⚙️</span> Ingestion & Cycle Configuration
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span>Active Provider: {providerConfig.activeProvider}</span>
                <span aria-hidden="true">·</span>
                <span>Worker Concurrency: Active</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600">Start:</span>
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => setStartDateStr(e.target.value)}
                  className="bg-transparent text-xs font-mono font-medium focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600">End:</span>
                <input
                  type="date"
                  value={endDateStr}
                  onChange={(e) => setEndDateStr(e.target.value)}
                  className="bg-transparent text-xs font-mono font-medium focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600">Leave Codes:</span>
                <input
                  type="text"
                  value={leaveCodesInput}
                  onChange={(e) => setLeaveCodesInput(e.target.value)}
                  placeholder="L, S, U"
                  className="w-20 bg-transparent text-xs font-mono font-medium focus:outline-none"
                />
              </div>

              <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{dateList.length} days</span>
              </div>
            </div>
          </div>

          {/* Dual Ingestion Dock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dock 1: Contracts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📄</span> 1. Employee Contracts Repository
                </label>
                {contracts.length > 0 && (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {contracts.length} loaded
                  </span>
                )}
              </div>

              <input
                type="file"
                ref={contractInputRef}
                onChange={handleContractUpload}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />

              <div
                onClick={() => contractInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20 rounded-xl p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-medium text-slate-700">
                  {contractFile ? contractFile.name : 'Select or drop Contract CSV / Excel file'}
                </span>
                <span className="text-[10px] text-slate-400">Headers: 'Employee #' & 'Contractual Days Per Week'</span>
              </div>

              {contractError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{contractError}</span>
                </div>
              )}
            </div>

            {/* Dock 2: Timesheet PDFs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📤</span> 2. Timesheet PDFs Batch
                </label>
                {pdfFiles.length > 0 && (
                  <button
                    onClick={clearAllPdfs}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear ({pdfFiles.length})
                  </button>
                )}
              </div>

              <input
                type="file"
                ref={pdfInputRef}
                onChange={handlePdfUpload}
                accept=".pdf"
                multiple
                className="hidden"
              />

              <div
                onClick={() => pdfInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20 rounded-xl p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-medium text-slate-700">
                  Select or drop one or multiple Timesheet PDFs
                </span>
                <span className="text-[10px] text-slate-400">
                  {pdfFiles.length > 0 ? `${pdfFiles.length} file(s) queued for worker` : 'Supports multi-document batches'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {contracts.length === 0 ? (
                <span>⚠️ Upload contract schedule first to calculate comp-off.</span>
              ) : pdfFiles.length === 0 ? (
                <span>Upload PDF files to start extraction.</span>
              ) : (
                <span>Ready to execute Web Worker batch extraction.</span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isAnalyzed && (
                <button
                  onClick={handleSaveBatchToHistory}
                  className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Save snapshot into IndexedDB"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Save Snapshot
                </button>
              )}

              <button
                onClick={handleExtract}
                disabled={isProcessing || pdfFiles.length === 0 || contracts.length === 0}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Worker Processing...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Extract & Reconcile {pdfFiles.length > 0 ? `${pdfFiles.length} File(s)` : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Web Worker Progress Bar */}
          {isProcessing && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-600 font-mono">
                <span>{progressStatus}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* WORKSPACE VIEWS */}
        {isAnalyzed && analytics ? (
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <DashboardAnalytics
                analytics={analytics}
                periodLabel={periodLabel}
                missingContracts={missingContracts}
                extractedRows={extractedRows}
                onSwitchToRoster={() => setActiveTab('roster')}
                onSwitchToCompOff={() => setActiveTab('comp-off')}
                onSwitchToLeave={() => setActiveTab('leave')}
              />
            )}

            {activeTab === 'roster' && (
              <RosterWorkstation
                rows={extractedRows}
                dateStrList={dateStrList}
                dayWeekdayMap={dayWeekdayMap}
                onUpdateCellCode={handleUpdateCellCode}
              />
            )}

            {activeTab === 'comp-off' && (
              <CompOffLedger records={compReport} />
            )}

            {activeTab === 'leave' && (
              <LeaveAudit records={leaveReport} />
            )}

            {/* Export Bar at Bottom */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Export & Payroll Dissemination</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={handleExportWideExcel}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Wide Excel (.xlsx)
                </button>

                <button
                  onClick={handleExportWideCSV}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Raw Roster (.csv)
                </button>

                <button
                  onClick={() =>
                    downloadCompOffCSV(
                      compReport,
                      `CompOff_Report_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
                    )
                  }
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Comp-Off Report (.csv)
                </button>

                <button
                  onClick={() =>
                    downloadLeaveCSV(
                      leaveReport,
                      `Leave_Report_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`
                    )
                  }
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Leave Audit (.csv)
                </button>
              </div>
            </section>
          </div>
        ) : (
          /* Empty / Zero-state Guidance */
          <div className="space-y-4">
            <div className="p-5 bg-blue-50/50 border border-blue-200 text-blue-900 text-xs rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <span>
                  Upload your contract file and timesheet PDFs to initiate worker parsing, or click <strong>"Load Demo"</strong> in the top navigation to inspect the interactive workstation immediately.
                </span>
              </div>
              <button
                onClick={handleLoadDemo}
                className="hidden sm:inline-block px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg shadow-2xs hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Load Sample Data
              </button>
            </div>

            {/* Sample Contract File Format Guide */}
            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
              <button
                onClick={() => setIsSampleExpanderOpen(!isSampleExpanderOpen)}
                className="w-full p-4 flex items-center justify-between text-left font-bold text-xs text-slate-800 hover:bg-slate-50/50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>📖</span> Sample Contract Format Specification
                </span>
                {isSampleExpanderOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {isSampleExpanderOpen && (
                <div className="p-5 border-t border-slate-100 space-y-4 bg-slate-50/30 text-xs">
                  <p className="text-slate-600">
                    The contract file establishes expected workdays per week to calculate statutory comp-off overtime:
                  </p>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                        <tr>
                          <th className="px-4 py-2 font-mono">Employee #</th>
                          <th className="px-4 py-2 font-mono">Contractual Days Per Week</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                        <tr>
                          <td className="px-4 py-2">005000</td>
                          <td className="px-4 py-2">5.5</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">005001</td>
                          <td className="px-4 py-2">6.0</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">005004</td>
                          <td className="px-4 py-2">7.0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] w-full sm:w-auto">
                      Employee #,Contractual Days Per Week{'\n'}005000,5.5{'\n'}005001,6.0{'\n'}005004,7.0
                    </pre>

                    <button
                      onClick={() => {
                        const blob = new Blob([SAMPLE_CONTRACT_CSV], { type: 'text/csv;charset=utf-8;' });
                        downloadBlob(blob, 'sample_contracts.csv');
                      }}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Template CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODALS */}
      <ProviderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={providerConfig}
        onSave={(newCfg) => {
          setProviderConfig(newCfg);
          saveProviderConfig(newCfg);
        }}
      />

      <BatchHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestoreBatch={handleRestoreBatch}
      />
    </div>
  );
}
