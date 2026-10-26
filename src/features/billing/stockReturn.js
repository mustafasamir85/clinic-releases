// ما يجب إرجاعه إلى المخزون عند حذف فاتورة: مستلزمات (وسماعة إن وُجدت).
//  1) فاتورة بيع مستلزمات: stock_lines المحفوظة وقت البيع، وللفواتير القديمة نطابق بنودها مع أسماء المستلزمات.
//  2) فاتورة زيارة: مستلزمات الزيارة المرتبطة بها (visit.charges.supplies) وسماعتها (visit.hearing_aid_id).
// لا يُرجَع إلا ما ما زال موجوداً في قوائم المخزون الحالية.
export function stockReturnsFor({ invoice, patients, supplies, hearingAids, isSale }) {
  const known = new Map(supplies.map((s) => [String(s.id), s]));
  let lines = [];
  let aidId = null;

  if (invoice.stock_lines?.length) {
    lines = invoice.stock_lines;
  } else if (isSale) {
    const byName = new Map();
    supplies.forEach((s) => byName.set(s.name, byName.has(s.name) ? null : s)); // اسم مكرر = لا نخمّن
    lines = (invoice.items ?? [])
      .filter((i) => Number(i.price) > 0 && byName.get(i.description))
      .map((i) => ({ id: byName.get(i.description).id, name: i.description, qty: Number(i.qty) }));
  } else {
    const visit = patients.flatMap((p) => p.visits ?? []).find((v) => v.invoice_id === invoice.id);
    if (visit) {
      lines = visit.charges?.supplies ?? [];
      aidId = visit.hearing_aid_id ?? null;
    }
  }

  const merged = new Map();
  lines.forEach((l) => {
    const supply = known.get(String(l.id));
    const qty = Number(l.qty);
    if (!supply || !(qty > 0)) return;
    const key = String(supply.id);
    merged.set(key, { id: supply.id, name: supply.name, qty: (merged.get(key)?.qty ?? 0) + qty });
  });

  const aid = aidId ? hearingAids.find((a) => String(a.id) === String(aidId)) : null;
  return {
    supplies: [...merged.values()],
    aid: aid ? { id: aid.id, name: `سماعة ${aid.brand} ${aid.model}` } : null,
  };
}
