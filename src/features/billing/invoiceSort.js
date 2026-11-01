import { patientDue } from '../../hooks/useInvoices';

// خيارات فرز قوائم الفواتير. 'default' = ترتيب التخزين (الأحدث إصداراً أولاً) دون فرز.
const remaining = (inv) => patientDue(inv) - (inv.paid ?? 0);
const byText = (get) => (a, b) => String(get(a) ?? '').localeCompare(String(get(b) ?? ''), 'ar', { numeric: true });

export const INVOICE_SORTS = [
  { id: 'default', label: 'الأحدث إصداراً', compare: null },
  { id: 'date-asc', label: 'الأقدم أولاً', compare: (a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')) || byText((i) => i.inv_no)(a, b) },
  { id: 'amount-desc', label: 'الأعلى مبلغاً', compare: (a, b) => (Number(b.total) || 0) - (Number(a.total) || 0) },
  { id: 'amount-asc', label: 'الأقل مبلغاً', compare: (a, b) => (Number(a.total) || 0) - (Number(b.total) || 0) },
  { id: 'due-desc', label: 'الأكبر متبقياً', compare: (a, b) => remaining(b) - remaining(a) },
  { id: 'name', label: 'اسم المريض (أ-ي)', compare: byText((i) => i.patient_name) },
];

export const isInvoiceSort = (id) => INVOICE_SORTS.some((s) => s.id === id);

// يرجع نسخة مرتبة (الفرز مستقر: المتساوي يحتفظ بترتيبه الأصلي)
export const sortInvoices = (list, sortId) => {
  const compare = INVOICE_SORTS.find((s) => s.id === sortId)?.compare;
  if (!compare) return list;
  return list.map((inv, i) => ({ inv, i })).sort((x, y) => compare(x.inv, y.inv) || x.i - y.i).map((x) => x.inv);
};
