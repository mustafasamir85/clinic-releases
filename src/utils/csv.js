// تنزيل جدول كملف CSV. BOM في البداية ليعرض Excel الحروف العربية صحيحة.
const escapeCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((r) => r.map(escapeCell).join(','));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
