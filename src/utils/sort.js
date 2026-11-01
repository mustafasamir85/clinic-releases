// فرز عام لجداول التقارير بالضغط على عنوان العمود.
// القيمة قد تكون رقماً أو نصاً منسّقاً: «12.5 د.أ» أو تاريخاً بصيغة 05/03/2026 أو اسماً.
// نحوّلها إلى مفتاح قابل للمقارنة: رقم ← تاريخ (yyyymmdd) ← نص عربي. الفارغ دائماً في النهاية.
const DMY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const NUMBER = /^-?\d[\d,]*(\.\d+)?(\s|$)/;

export const sortKey = (value) => {
  if (value === null || value === undefined || value === '' || value === '—' || value === 'غير محدد') return { kind: 'empty' };
  if (typeof value === 'number') return Number.isFinite(value) ? { kind: 'num', v: value } : { kind: 'empty' };
  if (typeof value !== 'string') return null; // عنصر React ونحوه: غير قابل للفرز
  const text = value.trim();
  const dmy = text.match(DMY);
  if (dmy) return { kind: 'num', v: Number(`${dmy[3]}${dmy[2].padStart(2, '0')}${dmy[1].padStart(2, '0')}`) };
  if (NUMBER.test(text)) return { kind: 'num', v: parseFloat(text.replace(/,/g, '')) };
  return { kind: 'text', v: text };
};

// يقارن مفتاحين؛ dir = 1 تصاعدي، -1 تنازلي. الفارغ في النهاية بغض النظر عن الاتجاه.
export const compareKeys = (a, b, dir = 1) => {
  if (a.kind === 'empty' || b.kind === 'empty') return a.kind === b.kind ? 0 : a.kind === 'empty' ? 1 : -1;
  if (a.kind === 'num' && b.kind === 'num') return (a.v - b.v) * dir;
  return String(a.v).localeCompare(String(b.v), 'ar', { numeric: true }) * dir;
};

// يفرز نسخة من الصفوف حسب accessor (دالة ترجع القيمة الخام للصف). فرز مستقر: المتساوي يبقى بترتيبه.
export const sortRows = (rows, accessor, dir) =>
  rows
    .map((row, index) => ({ row, index, key: sortKey(accessor(row)) ?? { kind: 'empty' } }))
    .sort((x, y) => compareKeys(x.key, y.key, dir) || x.index - y.index)
    .map((x) => x.row);
