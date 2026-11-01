// أنواع الوثائق التي تصدرها العيادة للمريض
export const DOC_TYPES = {
  report: { label: 'تقرير طبي', labelEn: 'Medical Report', prefix: 'MR' },
  leave: { label: 'إجازة مرضية', labelEn: 'Sick Leave Certificate', prefix: 'SL' },
};

// لغة الوثيقة: العربية افتراضية، والوثائق القديمة بلا lang عربية
export const DOC_LANGS = { ar: 'العربية', en: 'English' };
export const isEnglishDoc = (doc) => doc?.lang === 'en';

// اسم نوع الوثيقة بلغتها (وللقوائم: الإنجليزية تُميَّز بـ EN)
export const docLabel = (doc) => (isEnglishDoc(doc) ? `${DOC_TYPES[doc.type].labelEn} (EN)` : DOC_TYPES[doc.type].label);

// تاريخ YYYY-MM-DD بصيغة إنجليزية مقروءة: 27 October 2026 (بالتوقيت المحلي لتفادي إزاحة اليوم)
export const formatDateEN = (date) => {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

// يخمّن اسماً إنجليزياً للمريض: الحقل المحفوظ name_en إن وُجد، وإلا اسمه إن كان مكتوباً بحروف لاتينية
export const guessEnglishName = (patient) => {
  if (patient?.name_en) return patient.name_en;
  return /^[\x00-\x7F\s.'-]+$/.test(patient?.name ?? '') ? patient.name : '';
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

// ألفاظ إنجليزية حسب الجنس: Mr./Ms. والضمائر
export const englishTerms = (patient) =>
  patient?.gender === 'أنثى'
    ? { title: 'Ms.', subject: 'she', possessive: 'her' }
    : { title: 'Mr.', subject: 'he', possessive: 'his' };
