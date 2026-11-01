// حسابات المخزون المرتبطة بالزيارات والفواتير (دوال نقية بلا اعتماديات، قابلة للاختبار).
// الاصطلاح في inventory.adjustUsage: qty موجب = استهلاك إضافي من المخزون، qty سالب = إرجاع للمخزون.

// إرجاع أصناف إلى المخزون: نفس الأصناف بكميات سالبة (حذف زيارة/فاتورة، مرتجع بيع)
export const returnToStock = (supplies = []) => supplies.map((s) => ({ id: s.id, name: s.name, qty: -s.qty }));

// الفرق بين مستلزمات زيارة قبل التعديل وبعده، لكل صنف (موجب = استهلاك إضافي، سالب = إرجاع)
export function supplyUsageDeltas(before = [], after = []) {
  const oldQty = new Map(before.map((s) => [s.id, s.qty]));
  const newQty = new Map(after.map((s) => [s.id, s.qty]));
  const names = new Map([...before, ...after].map((s) => [s.id, s.name]));
  return [...new Set([...oldQty.keys(), ...newQty.keys()])].map((id) => ({
    id,
    name: names.get(id),
    qty: (newQty.get(id) ?? 0) - (oldQty.get(id) ?? 0),
  }));
}

// فاتورة الزيارة حُذفت من قسم الفواتير؟ (عندها أُرجعت مستلزماتها وسماعتها وقت حذفها فلا تُرجَع ثانية)
export const isVisitInvoiceGone = (visit, invoices) => Boolean(visit?.invoice_id) && !invoices.some((i) => i.id === visit.invoice_id);
