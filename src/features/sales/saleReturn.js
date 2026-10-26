// منطق مرتجع بيع المستلزمات (دوال نقية بلا React).
// المرتجع يُلحَق بفاتورة البيع ولا يعدّل بنودها الأصلية:
//  - بنود سالبة (id يبدأ بـ return-) تخفض الإجمالي،
//  - invoice.returns: سجل المرتجعات (التاريخ، المستخدم، السبب، الأصناف، المبلغ المسترد)،
//  - invoice.stock_lines: يُحدَّث ليبقى فيه ما لم يُرجَع بعد (حتى لا يُرجَع للمخزون مرتين عند حذف الفاتورة).
const round2 = (n) => Math.round(n * 100) / 100;

export const RETURN_ITEM_PREFIX = 'return-';
export const DISCOUNT_ITEM_ID = 'discount-manual';

const isReturnItem = (i) => String(i.id ?? '').startsWith(RETURN_ITEM_PREFIX);
const isDiscountItem = (i) => i.id === DISCOUNT_ITEM_ID;
const isSoldItem = (i) => Number(i.price) > 0 && !isReturnItem(i) && !isDiscountItem(i);

// الأصناف المباعة في الفاتورة وما يمكن إرجاعه منها.
// يعيد [{ name, supplyId|null, unit, price, netPrice, sold, returned, max }]
//  - netPrice: سعر الوحدة بعد توزيع خصم الفاتورة نسبياً (ما دفعه العميل فعلاً عن الوحدة).
//  - supplyId: يُستنتج من stock_lines، وللفواتير القديمة من اسم المستلزم إن كان فريداً؛ وإلا null (يُسترد المبلغ دون مخزون).
export function returnableLines(invoice, supplies) {
  const items = invoice.items ?? [];
  const sold = new Map();
  items.filter(isSoldItem).forEach((i) => {
    const cur = sold.get(i.description) ?? { name: i.description, price: Number(i.price), sold: 0 };
    cur.sold += Number(i.qty) || 0;
    sold.set(i.description, cur);
  });

  const gross = [...sold.values()].reduce((t, l) => t + l.sold * l.price, 0);
  const discount = Math.abs(items.filter(isDiscountItem).reduce((t, i) => t + Number(i.qty) * Number(i.price), 0));
  const ratio = gross > 0 ? Math.max(0, (gross - discount) / gross) : 1;

  const returned = new Map();
  (invoice.returns ?? []).forEach((r) => (r.lines ?? []).forEach((l) => returned.set(l.name, (returned.get(l.name) ?? 0) + Number(l.qty))));

  const byName = new Map();
  supplies.forEach((s) => byName.set(s.name, byName.has(s.name) ? null : s)); // اسم مكرر = لا نخمّن
  const stockIdByName = new Map((invoice.stock_lines ?? []).map((l) => [l.name, l.id]));
  const idOf = (name) => {
    const fromStock = stockIdByName.get(name);
    if (fromStock !== undefined && supplies.some((s) => String(s.id) === String(fromStock))) return fromStock;
    return byName.get(name)?.id ?? null;
  };

  return [...sold.values()].map((l) => {
    const back = returned.get(l.name) ?? 0;
    const supplyId = idOf(l.name);
    return {
      name: l.name,
      supplyId,
      unit: supplies.find((s) => String(s.id) === String(supplyId))?.unit ?? '',
      price: l.price,
      netPrice: l.price * ratio,
      sold: l.sold,
      returned: back,
      max: Math.max(0, l.sold - back),
    };
  });
}

// يبني نتيجة مرتجع جديد من اختيارات المستخدم.
// selections: [{ name, qty }] — تُتجاهل الكميات الصفرية وتُقصّ على المتاح للإرجاع.
// يعيد { entry, items, stockLines, stockBack, value } أو { error } إن لم يُختر شيء.
export function buildSaleReturn({ invoice, supplies, selections, reason, user, id, date }) {
  const lines = returnableLines(invoice, supplies);
  const chosen = [];
  selections.forEach((sel) => {
    const line = lines.find((l) => l.name === sel.name);
    const qty = Math.min(Math.floor(Number(sel.qty)) || 0, line?.max ?? 0);
    if (line && qty > 0) chosen.push({ line, qty });
  });
  if (chosen.length === 0) return { error: 'اختر كمية صنف واحد على الأقل للإرجاع.' };

  const entryLines = chosen.map(({ line, qty }) => ({ id: line.supplyId, name: line.name, qty, price: line.price, amount: round2(qty * line.netPrice) }));
  const value = round2(entryLines.reduce((t, l) => t + l.amount, 0));

  const items = chosen.map(({ line, qty }, idx) => ({
    id: `${RETURN_ITEM_PREFIX}${id}-${idx}`,
    description: `مرتجع: ${line.name}`,
    qty,
    price: -(entryLines[idx].amount / qty),
  }));

  // ما بقي مباعاً بعد هذا المرتجع (للأصناف المعروفة في المخزون فقط)
  const remaining = new Map();
  lines.forEach((l) => l.supplyId != null && remaining.set(l.name, { id: l.supplyId, name: l.name, qty: l.max }));
  chosen.forEach(({ line, qty }) => remaining.has(line.name) && (remaining.get(line.name).qty -= qty));
  const stockLines = [...remaining.values()].filter((l) => l.qty > 0);

  return {
    value,
    items,
    stockLines,
    stockBack: chosen.filter(({ line }) => line.supplyId != null).map(({ line, qty }) => ({ id: line.supplyId, name: line.name, qty })),
    entry: {
      id,
      date,
      by: user?.name || user?.username || '',
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
      lines: entryLines,
      amount: value,
    },
  };
}

// ما سيُرَدّ نقداً للعميل لو أُرجعت قيمة value: المدفوع الذي يزيد عن المستحق الجديد
export function refundFor(invoice, value) {
  const newTotal = round2((Number(invoice.total) || 0) - value);
  const due = round2(newTotal - (invoice.insurance_amount ?? 0));
  return { newTotal, refund: round2(Math.max(0, (Number(invoice.paid) || 0) - Math.max(0, due))) };
}

// حالة عرض المرتجع في قائمة المبيعات: null | 'partial' | 'full'
export function returnState(invoice, supplies) {
  if (!invoice.returns?.length) return null;
  return returnableLines(invoice, supplies).every((l) => l.max === 0) ? 'full' : 'partial';
}

export const canReturn = (invoice, supplies) => returnableLines(invoice, supplies).some((l) => l.max > 0);
