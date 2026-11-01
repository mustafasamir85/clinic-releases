// ملخّص حذف فاتورة: ما سيُعاد للمخزون ورسالة التأكيد ونص الإشعار بعد الحذف (دالة نقية بلا اعتماديات).
//  - back: ناتج stockReturnsFor ({ supplies: [{ name, qty }], aid: { id, name } | null })
//  - canReturnAids: هل يملك المستخدم صلاحية إرجاع السماعات للمخزون؟
export function summarizeInvoiceDeletion({ invoice, back, canReturnAids }) {
  const returnAid = Boolean(back.aid) && canReturnAids;
  const restored = [...back.supplies.map((s) => `${s.name} × ${s.qty}`), ...(returnAid ? [back.aid.name] : [])];

  const warning = invoice.paid > 0 ? `\nتنبيه: سُجّل عليها مدفوعات (${invoice.paid} د.أ) وستختفي من الحسابات والتقارير.` : '';
  const stockNote = restored.length > 0 ? `\nسيُعاد إلى المخزون: ${restored.join('، ')}.` : '';
  const aidNote = back.aid && !returnAid ? `\nلن تُرجَع ${back.aid.name} تلقائياً لأن حسابك لا يملك صلاحية مخزون السماعات.` : '';

  return {
    returnAid,
    restored,
    message: `حذف الفاتورة ${invoice.inv_no} (${invoice.patient_name}) بالكامل؟${warning}${stockNote}${aidNote}`,
    successText: restored.length > 0 ? 'تم حذف الفاتورة وإرجاع الكميات إلى المخزون.' : 'تم حذف الفاتورة.',
  };
}
