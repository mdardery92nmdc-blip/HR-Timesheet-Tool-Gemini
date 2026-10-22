# 📊 HR Timesheet Extractor Pro

A modern React-based web tool to extract attendance data from PDF timesheets, cross-reference employee contracts, and automatically calculate Comp-Off & Leave reports.

## Features

- 📄 **PDF Text Extraction**: Extracts employee information (Name, Number, Designation, Company) and attendance codes (W, WHF, WHH, H, HD, CO, S, L, U, OFF) directly in the browser via `pdfjs-dist`.
- 📅 **Dynamic Payroll Period**: Flexible date selection (defaulting to the 20th of the previous month through the 19th of the current month).
- ⚖️ **Contractual Comp-Off Calculation**: Automatically calculates weekly excess comp-off earned based on contractual work arrangements (5.5, 6.0, or 7.0 days/week).
- 📋 **Leave Tracking**: Configurable leave codes (e.g. `L, S, U`) with detailed date lists.
- 💾 **Multi-Sheet Excel & CSV Export**:
  - Formatted Wide Excel workbook (`.xlsx`) with 3 comprehensive sheets: **Timesheets** (with weekdays and freeze panes), **Comp-Off Report**, and **Leave Report**.
  - Downloadable Comp-Off Report (CSV).
  - Downloadable Leave Report (CSV).
  - Raw timesheet data (CSV).
- ✨ **Sample Demo Data**: Built-in 1-click sample demo data loader and sample contract template download.

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available on `http://localhost:3000`.

## Deployment to Render

### Option 1: Web Service (Current Setup)
- **Environment**: Node
- **Build Command**: `npm run build` (or `yarn build`)
- **Start Command**: `npm start` (or `yarn start`)

The built-in `server.js` automatically binds to `0.0.0.0:$PORT` assigned by Render and serves the SPA.

### Option 2: Static Site (Alternative - Free Tier)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

## Input Format

### Contract File (CSV or Excel)
Must contain columns:
- `Employee #`: Employee ID / Badge number
- `Contractual Days Per Week`: 5, 5.5, 6, or 7

### Timesheet PDFs
PDF timesheets containing:
- Employee info: Name, Number, Designation, Company
- Attendance row matching days 1 to 31 with standard codes (`W`, `WHF`, `WHH`, `H`, `HD`, `CO`, `S`, `L`, `U`, `OFF`)
