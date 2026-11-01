// ربط فاتورة الزيارة عند الإضافة/التعديل (دوال نقية بلا اعتماديات).

// بيانات التأمين المخزّنة على الفاتورة من تفاصيل الزيارة (null إن لم تُحدَّد شركة)
export const insuranceInfoFrom = (details) =>
  details?.insurance_company ? { name: details.insurance_company, copay: details.insurance_copay } : null;

// عند تعديل زيارة: ماذا نفعل بفاتورتها؟
//  - item: بند الفاتورة الجديد (null = لم يبقَ شيء يُفوتَر)
//  - invoiceId: فاتورة الزيارة المسجّلة؛ إن حُذفت من قسم الفواتير تُعامل كأنها غير موجودة
// الناتج: { action: 'update' | 'create' | 'cancel' | 'none', invoiceId: الفاتورة الموجودة فعلاً أو null }
export function planVisitInvoiceSync({ item, invoiceId, invoices }) {
  const existingId = invoiceId && invoices.some((i) => i.id === invoiceId) ? invoiceId : null;
  if (item && existingId) return { action: 'update', invoiceId: existingId };
  if (item) return { action: 'create', invoiceId: null };
  if (existingId) return { action: 'cancel', invoiceId: existingId };
  return { action: 'none', invoiceId: null };
}
