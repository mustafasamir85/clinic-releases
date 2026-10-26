// أنواع الوثائق التي تصدرها العيادة للمريض
export const DOC_TYPES = {
  report: { label: 'تقرير طبي', prefix: 'MR' },
  leave: { label: 'إجازة مرضية', prefix: 'SL' },
};

// يضيف أياماً لتاريخ YYYY-MM-DD ويعيد YYYY-MM-DD (بالتوقيت المحلي لتفادي إزاحة اليوم)
export const addDays = (date, days) => {
  const [y, m, d] = date.split('-').map(Number);
  const result = new Date(y, m - 1, d + days);
  return [result.getFullYear(), String(result.getMonth() + 1).padStart(2, '0'), String(result.getDate()).padStart(2, '0')].join('-');
};

// رقم الوثيقة التالي من كل وثائق المرضى: MR-2026-001
export const nextDocumentNo = (patients, type) => {
  const { prefix } = DOC_TYPES[type];
  const year = new Date().getFullYear();
  const max = patients
    .flatMap((p) => p.documents ?? [])
    .filter((d) => d.type === type)
    .reduce((m, d) => {
      const n = parseInt(String(d.no).match(/(\d+)$/)?.[1], 10);
      return Number.isNaN(n) ? m : Math.max(m, n);
    }, 0);
  return `${prefix}-${year}-${String(max + 1).padStart(3, '0')}`;
};

// ألفاظ حسب الجنس
export const honorific = (patient) => (patient?.gender === 'أنثى' ? 'السيدة' : 'السيد');
