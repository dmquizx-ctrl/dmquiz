import * as XLSX from 'xlsx';

// ดาวน์โหลด blob ผ่าน <a download> — เรียกพร้อมกับ click handler เพื่อรักษา user activation
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

type Cell = string | number | null;

interface SheetInput {
  name: string;
  rows: Cell[][];
}

/**
 * สร้างไฟล์ .xlsx จากแถวข้อมูล (แถวแรก ๆ เป็นหัวเรื่อง/หัวตารางตามที่ส่งมา)
 * แล้วส่งออกให้ผู้ใช้ดาวน์โหลดทันที ความกว้างคอลัมน์ปรับอัตโนมัติตามเนื้อหา
 */
export function exportAoaToXlsx(sheets: SheetInput[], filename: string) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    // ปรับความกว้างคอลัมน์ตามความยาวข้อความมากสุดของคอลัมน์นั้น (รวมหัวเรื่องที่ merge ข้ามไว้)
    const colCount = Math.max(...sheet.rows.map((r) => r.length), 1);
    const widths: { wch: number }[] = [];
    for (let c = 0; c < colCount; c++) {
      let maxLen = 0;
      for (const row of sheet.rows) {
        const value = row[c];
        const len = value == null ? 0 : String(value).length;
        if (len > maxLen) maxLen = len;
      }
      widths.push({ wch: Math.min(Math.max(maxLen + 2, 8), 60) });
    }
    ws['!cols'] = widths;
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

export const thaiToday = () => new Date().toLocaleDateString('th-TH');
