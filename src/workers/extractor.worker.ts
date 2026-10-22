import * as pdfjsLib from 'pdfjs-dist';

// Configure worker inside web worker if needed
if (typeof window !== 'undefined' || typeof self !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

interface WorkerTaskFile {
  name: string;
  buffer: ArrayBuffer;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, files, dateDays } = e.data;

  if (type === 'START_EXTRACTION') {
    const results = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const fileData: WorkerTaskFile = files[i];
      self.postMessage({
        type: 'PROGRESS',
        fileIndex: i + 1,
        totalFiles: total,
        fileName: fileData.name
      });

      try {
        const loadingTask = pdfjsLib.getDocument({
          data: fileData.buffer,
          useSystemFonts: true
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();

        const items: any[] = [];
        for (const itm of textContent.items as any[]) {
          if (!itm.str || !itm.str.trim()) continue;
          items.push({
            str: itm.str,
            x: itm.transform ? itm.transform[4] : 0,
            y: itm.transform ? itm.transform[5] : 0,
            width: itm.width || 0,
            height: itm.height || 0
          });
        }

        items.sort((a, b) => b.y - a.y || a.x - b.x);

        const rows: { y: number; items: any[]; text: string }[] = [];
        const Y_TOL = 4.0;
        for (const item of items) {
          const ex = rows.find(r => Math.abs(r.y - item.y) <= Y_TOL);
          if (ex) {
            ex.items.push(item);
          } else {
            rows.push({ y: item.y, items: [item], text: '' });
          }
        }

        for (const row of rows) {
          row.items.sort((a, b) => a.x - b.x);
          row.text = row.items.map(it => it.str.trim()).join(' ');
        }

        const fullText = rows.map(r => r.text).join('\n');

        const employeeInfo = {
          name: 'Not Found',
          number: 'Not Found',
          designation: 'Not Found',
          company: 'Not Found'
        };

        const nameMatch = fullText.match(/NAME\s*[:\s]+([^:\n]+?)(?=\s*(?:NUMBER|DESIGNATION|COMPANY|EMPLOYEE|\n|$))/i);
        const numMatch = fullText.match(/NUMBER\s*[:\s]+(\d+)/i) || fullText.match(/EMP(?:LOYEE)?\s*(?:NO|ID|#)?\s*[:\s]+(\d+)/i);
        const desMatch = fullText.match(/DESIGNATION\s*[:\s]+([^:\n]+?)(?=\s*(?:NUMBER|DESIGNATION|COMPANY|EMPLOYEE|\n|$))/i);
        const comMatch = fullText.match(/COMPANY\s*[:\s]+([^:\n]+?)(?=\s*(?:NUMBER|DESIGNATION|COMPANY|EMPLOYEE|\n|$))/i);

        if (nameMatch && nameMatch[1]) employeeInfo.name = nameMatch[1].trim();
        if (numMatch && numMatch[1]) employeeInfo.number = numMatch[1].trim();
        if (desMatch && desMatch[1]) employeeInfo.designation = desMatch[1].trim();
        if (comMatch && comMatch[1]) employeeInfo.company = comMatch[1].trim();

        const attendanceCodes: Record<number, string> = {};
        const attRowIdx = rows.findIndex(r => r.text.toUpperCase().includes('ATTENDANCE'));

        const dayHeaderRow: { day: number; x: number }[] = [];
        if (attRowIdx > 0) {
          const prevRow = rows[attRowIdx - 1];
          for (const itm of prevRow.items) {
            const d = parseInt(itm.str.trim(), 10);
            if (!isNaN(d) && d >= 1 && d <= 31) {
              dayHeaderRow.push({ day: d, x: itm.x });
            }
          }
        }

        if (dayHeaderRow.length >= 10 && attRowIdx >= 0) {
          const attRow = rows[attRowIdx];
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

        if (Object.keys(attendanceCodes).length === 0) {
          const validCodes = ['W', 'WHF', 'WHH', 'H', 'HD', 'CO', 'S', 'L', 'U', 'OFF'];
          for (let rIdx = 0; rIdx < rows.length; rIdx++) {
            const row = rows[rIdx];
            const codeItems = row.items.filter(it => validCodes.includes(it.str.trim().toUpperCase()));
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

        const itemResult = {
          serial: i + 1,
          fileName: fileData.name,
          employeeInfo,
          attendanceCodes,
          extractionSource: 'vector-pdf'
        };

        results.push(itemResult);
        self.postMessage({
          type: 'ITEM_COMPLETE',
          item: itemResult
        });
      } catch (err: any) {
        results.push({
          serial: i + 1,
          fileName: fileData.name,
          employeeInfo: { name: 'Error', number: 'Error', designation: 'Error', company: 'Error' },
          attendanceCodes: {},
          extractionSource: 'vector-pdf',
          warnings: [err?.message || 'Failed to parse PDF']
        });
      }
    }

    self.postMessage({
      type: 'COMPLETE',
      results
    });
  }
};
