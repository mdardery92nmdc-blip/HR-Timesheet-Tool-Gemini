# Enterprise HR Timesheet Extractor & Workforce Intelligence Blueprint

A comprehensive architectural blueprint to elevate HR Timesheet Extractor Pro from a single-page utility into a modern, enterprise-grade workforce operations dashboard. The architecture combines a client-side Web Worker concurrency pipeline, IndexedDB caching for local offline persistence, interactive payroll analytics, and a provider-agnostic fallback registry for OCR and multimodal document AI.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions incorporate your confirmed preferences:
> - **Execution & Compute Model**: Client-side Web Worker architecture with zero server latency, local IndexedDB caching, and offline-first data persistence.
> - **Interface Direction**: Modern enterprise HR dashboard with high-density data tables, interactive payroll analytics cards, and clean typography.
> - **Extensibility & Fallback Layer**: Vector PDF extraction runs as the primary high-speed engine, complemented by a pluggable fallback provider registry (Tesseract OCR & Gemini Multimodal Document AI API key configuration) ready for future activation.

- **Confirmed Decision 1**: Client-side Web Worker processing ensures 100% data privacy (sensitive HR timesheet PDFs and salary contract data never leave the user's browser).
- **Confirmed Decision 2**: Pluggable provider map architecture enables instant switching between local Vector parser, local browser OCR, or cloud Document AI via configurable API keys.

---

## 1. Overview & Core Concept

### What It Does
An enterprise HR operations platform designed to extract, reconcile, and audit complex attendance records across diverse contractual schedules. It ingests batch employee PDF timesheets, cross-references contractual agreements (5.0, 5.5, 6.0, 7.0 days/week), calculates statutory comp-off balances and leave accruals, and produces executive analytics alongside payroll-ready Excel workbooks.

### Target Audience & Persona
- **HR Directors & Payroll Managers**: Processing monthly attendance cycles for multi-site industrial, marine, engineering, or offshore contractors.
- **Site QA & Project Controllers**: Verifying contractor presence, overtime hours, and contractual compliance against roster schedules.

### Key Value
- **Zero Compute Cost & Complete Privacy**: Processes gigabytes of PDF documents client-side without costly server infrastructure or GDPR/confidentiality exposure.
- **Instant Payroll Reconciliation**: Eliminates days of manual timesheet data entry and contractual overtime reconciliation into seconds with auditable precision.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Workspace Overview & Period Setup**:
   - The user lands on the Workforce Analytics workspace showing historical extraction batches and a persistent payroll period selector (defaulting to 20th–19th cycle).
   - Instant visual indicators summarize contract readiness, active leave code definitions (`L`, `S`, `U`, `CO`), and provider engine status.

2. **Dual-Zone Drag & Drop Ingestion**:
   - Split ingestion dock: **Contract Repository** (CSV/XLSX) and **Timesheet PDF Batch**.
   - Live validation displays contract coverage health immediately upon contract drop (e.g., "54 contracts verified, 2 missing IDs").
   - PDF dropzone supports bulk upload with individual file size, page count inspection, and remove/retry capabilities.

3. **Background Worker Processing & Real-Time Status**:
   - Extraction runs on dedicated Web Worker threads, preventing UI lockup.
   - Progress gauge displays real-time per-file extraction progress, speed metrics (files/sec), and parsing diagnostics.

4. **Executive Dashboard & Metric Highlights**:
   - Four primary KPI cards: **Total Active Workforce**, **Comp-Off Liability (Days)**, **Unplanned Leave Rate (%)**, and **Contract Reconciliation Delta**.
   - Interactive breakdown charts showing attendance code distribution across the payroll cycle.

5. **Multi-View Data Workstation**:
   - **Wide Roster View**: Sticky headers with dynamic calendar dates and weekday labels, cell highlighting by attendance type (`W`, `WHF`, `WHH`, `H`, `HD`, `CO`, `L`, `S`, `U`, `OFF`), and inline quick search.
   - **Comp-Off Ledger**: Auditable breakdown of weekly expected vs. actual days worked, flagging exact weeks generating comp-off excess.
   - **Leave Audit**: Sorted leave ledger itemizing exact absence dates and categorizing by leave code.

6. **Export & Integration Hub**:
   - Formatted `.xlsx` export with freeze panes at `G3`, custom corporate styling, and weekday subheaders.
   - Separate CSV download channels for Comp-Off and Leave reports.
   - "Save Batch to Local History" for future audit comparisons.

---

### Visual Identity & Theme

- **Aesthetic Direction**: Contemporary enterprise SaaS dashboard inspired by modern productivity systems (Linear, Vercel, Stripe). Clean surfaces, high-contrast typographic hierarchy, and zero pseudo-technical clutter.
- **Color Palette & Distribution (60-30-10 Rule)**:
  - `60% Neutral Canvas`: Pure white (`#FFFFFF`) with cool slate backgrounds (`#F8FAFC`).
  - `30% Structural Surfaces`: Subdued card surfaces (`#FFFFFF`), hairline dividers (`#E2E8F0`), and soft dark slate typography (`#0F172A`).
  - `10% Purposeful Accents`: Corporate primary blue (`#2563EB`), emerald success indicators (`#16A34A`), amber alert states (`#D97706`), and crimson leave badges (`#DC2626`).
- **Typography**:
  - Display & Headings: `Plus Jakarta Sans` (refined geometric sans-serif for executive clarity).
  - Body & UI: `DM Sans` or `Plus Jakarta Sans` (14px baseline with 1.5 line height).
  - Data & Telemetry: `JetBrains Mono` with `tabular-nums` for precision alignment across day columns and numbers.
- **Component Styling & Anti-Slop Discipline**:
  - Zero static pill badges; metadata displayed as clean unboxed text with typographic separators (`·`).
  - Hairline 1px borders (`border-slate-200`) with single-elevation depth.
  - Interactive filter tabs styled with subtle segmented control containers.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Client-Side Web Worker Pipeline vs. Serverless Node Backend
- **Chosen Approach**: Offload PDF parsing, regex matching, and ISO-8601 comp-off matrix calculations to a dedicated Web Worker thread.
- **Why**: 
  - Complete data privacy: Employee payroll PDFs and contractual terms contain sensitive PII that enterprise clients often prohibit uploading to third-party cloud servers.
  - Infinite scalability: Processing scales with client CPU cores at zero cloud compute cost.
  - Zero cold starts or upload timeouts on large multi-megabyte PDF batches.
- **Trade-Off**: Relies on client hardware performance; mitigated by chunked worker queue processing and progress reporting.

### Decision 2: IndexedDB Local Cache & Batch History
- **Chosen Approach**: Store parsed batches, historical rosters, and uploaded contract rosters in client-side IndexedDB with `idb-keyval` abstraction.
- **Why**: Allows HR teams to switch between payroll periods, compare month-over-month variances, and reload previous reports without re-uploading PDFs.
- **Alternatives Considered**: `localStorage` (limited to 5MB, easily exceeded by PDF text dumps) or cloud database (requires user authentication, database provisioning, and privacy compliance).

### Decision 3: Pluggable Fallback Provider Registry & API Key Map
- **Chosen Approach**: Modular document parsing interface with three provider tiers:
  1. `Tier 1 (Default)`: In-browser Vector Text & Table Parser (`pdfjs-dist`) for instantaneous 100ms/file extraction.
  2. `Tier 2 (Client OCR)`: In-browser WebAssembly OCR worker (`tesseract.js`) triggered when vector text yield is below threshold.
  3. `Tier 3 (AI Multimodal DocAI)`: Configurable API Key map interface supporting Google Gemini multimodal vision endpoints for arbitrary or non-standard scanned timesheet structures.
- **Why**: Satisfies your explicit requirement for Tier 2/3 fallbacks with an extensible API key configuration map without locking the app into mandatory paid services.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER RUNTIME                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                            USER INTERFACE                             │  │
│  │                                                                       │  │
│  │  ┌───────────────────────┐  ┌──────────────────────────────────────┐  │  │
│  │  │ Period & Config Bar   │  │ Batch Upload & Dropzone              │  │  │
│  │  │ (Dates, Leave Codes)  │  │ (Contracts CSV/XLSX, Timesheet PDFs) │  │  │
│  │  └───────────┬───────────┘  └──────────────────┬───────────────────┘  │  │
│  │              │                                 │                      │  │
│  │              ▼                                 ▼                      │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                WORKFLOW & STATE ORCHESTRATION                   │  │  │
│  │  │       (Zustand / React Context + IndexedDB Local Cache)         │  │  │
│  │  └───────┬───────────────────────────────────────────┬─────────────┘  │  │
│  │          │                                           │                │  │
│  │          ▼                                           ▼                │  │
│  │  ┌───────────────────────┐                   ┌─────────────────────┐  │  │
│  │  │ Executive Dashboard   │                   │ Export Engine       │  │  │
│  │  │ - Workforce KPIs      │                   │ - Styled ExcelJS    │  │  │
│  │  │ - Wide Roster Table   │                   │ - Comp-Off CSV      │  │  │
│  │  │ - Comp-Off / Leave Rep│                   │ - Leave Audit CSV   │  │  │
│  │  └───────────────────────┘                   └─────────────────────┘  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │ Web Worker Messages                   │
│                                     ▼                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      WEB WORKER COMPUTE ENGINE                        │  │
│  │                                                                       │  │
│  │   ┌───────────────────────────┐         ┌──────────────────────────┐  │  │
│  │   │ Contract Parser           │         │ Attendance Calculator    │  │  │
│  │   │ (XLSX Sheet Reader)       │         │ (ISO-8601 Weekly Engine) │  │  │
│  │   └─────────────┬─────────────┘         └────────────▲─────────────┘  │  │
│  │                 │                                    │                │  │
│  │                 └─────────────────┐                  │                │  │
│  │                                   ▼                  │                │  │
│  │   ┌──────────────────────────────────────────────────┴─────────────┐  │  │
│  │   │            PLUGGABLE DOCUMENT PARSER REGISTRY                  │  │  │
│  │   │                                                                │  │
│  │   │  [Provider 1: Vector PDF]  --> High Speed Text & Table Stream  │  │  │
│  │   │  [Provider 2: WASM OCR]    --> Browser Tesseract Fallback      │  │  │
│  │   │  [Provider 3: DocAI Map]   --> Configurable API Key Fallback   │  │  │
│  │   └────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Core Data Models

```typescript
// Contract definition
export interface EmployeeContract {
  employeeNum: string;
  normalizedId: string;
  contractualDaysPerWeek: 5.0 | 5.5 | 6.0 | 7.0;
  department?: string;
  siteLocation?: string;
}

// Extracted Daily Attendance Record
export interface DailyRecord {
  date: string;           // "20-Apr"
  dayOfWeek: string;      // "Monday"
  isoWeek: number;        // ISO 8601 week index
  code: string;           // "W", "WHF", "WHH", "H", "HD", "CO", "L", "S", "U", "OFF"
  workValue: number;      // 1.0, 0.5, 0.0
  expectedValue: number;  // based on contractual schedule
  isLeave: boolean;       // matches configured leave codes
}

// Complete Employee Extraction Result
export interface TimesheetBatchItem {
  id: string;
  filename: string;
  employeeNum: string;
  employeeName: string;
  designation: string;
  company: string;
  dailyRecords: Record<string, DailyRecord>;
  compOffDaysEarned: number;
  totalLeaveDays: number;
  leaveDates: string[];
  extractionSource: 'vector-pdf' | 'wasm-ocr' | 'doc-ai';
  warnings: string[];
}

// Provider Map Registry Interface
export interface ExtractionProviderConfig {
  activeProvider: 'vector-pdf' | 'wasm-ocr' | 'doc-ai';
  enableOcrFallback: boolean;
  enableDocAiFallback: boolean;
  apiKeys: {
    geminiApiKey?: string;
    customEndpointUrl?: string;
  };
}
```

---

### Interactive Component & State Mapping

| Component Module | User Interaction Trigger | State Mutation & Effect |
| :--- | :--- | :--- |
| **`ConfigBar`** | Changes start/end dates or leave codes | Re-generates `dateList` calendar and triggers instant live re-calculation of `compReport` and `leaveReport` across in-memory rows without re-parsing files. |
| **`DropzoneDeck`** | Drops contract file (.xlsx / .csv) | Parses workbook in worker, normalizes employee IDs, computes contract match rate, and updates `missingContracts` alerts. |
| **`DropzoneDeck`** | Drops batch of timesheet PDFs | Enqueues files into Web Worker queue, emits progressive progress percentages, and updates real-time worker logs. |
| **`WorkstationView`** | Searches by name, badge, company | Filters visible rows in data grid using low-latency debounce with zero DOM lag. |
| **`WorkstationView`** | Clicks inline attendance code | Allows manual override or correction of misread codes, triggering automatic instant recalculation of comp-off and leave statistics. |
| **`ProviderSettingsModal`** | Enters API keys or toggles fallbacks | Saves provider preferences to local encrypted storage and updates the extraction fallback pipeline. |
| **`ExportHub`** | Clicks "Download Wide Excel" | Streams stylized multi-layered Excel workbook with custom fills, weekday subheaders, and freeze panes directly to client disk. |

---

## 5. Phased Implementation Roadmap (For Future Execution)

- **Phase 1: Worker Architecture & Local Store**:
  - Implement `worker/extractor.worker.ts` with isolated `pdfjs-dist` pipeline.
  - Implement IndexedDB repository for batch history persistence.
- **Phase 2: Modern Enterprise Dashboard Interface**:
  - Implement full-width responsive 1440px layout with high-density table and KPI cards.
  - Add search, column sorting, and editable attendance cell overrides.
- **Phase 3: Fallback Provider Map & Settings**:
  - Build settings modal with API key configuration for OCR and multimodal document AI.
  - Wire up graceful fallback detection if a scanned PDF yields no text layers.
- **Phase 4: Export Engine Polish & Verification**:
  - Enhance `ExcelJS` export with corporate styling and complete verification.
