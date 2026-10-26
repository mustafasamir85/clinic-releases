// الخدمة المجانية = خيار على بند الإجراء نفسه (وليس قائمة مستقلة).
// يبقى البند بسعره الأصلي في الفاتورة، ويُضاف تحته بند خصم سالب بنفس القيمة (free_of = اسم الخدمة)،
// فيصبح صافي الخدمة صفراً وتظهر قيمتها الأصلية في التقارير. (نفس أسلوب بند خصم العروض)

const round2 = (n) => Math.round(n * 100) / 100;

export const FREE_LABEL = 'مجاني: ';
export const FREE_TEXT = 'مجاني';

// بند الخصم المقابل لخدمة مجانية
export const freeOffsetItem = ({ id, name, price, qty = 1 }) => ({
  id: `free-${id}`,
  free_of: name,
  description: `${FREE_LABEL}${name}`,
  qty: 1,
  price: -round2(Number(price || 0) * Number(qty || 0)),
});

// بنود محرر الفاتورة (فيها free: true على الصف) ← بنود الفاتورة الفعلية (بند + بند خصم مقابل)
export const expandFree = (items) =>
  items.flatMap((item) => {
    if (!item.free) return [item];
    const { free, ...rest } = item;
    const offset = freeOffsetItem({ id: item.id, name: item.description, price: item.price, qty: item.qty });
    return offset.price < 0 ? [rest, offset] : [rest];
  });

// بنود الفاتورة المحفوظة ← بنود المحرر: يُدمج بند الخصم المقابل في صف الخدمة كعلامة free
export const collapseFree = (items) => {
  const offsets = items.filter((i) => i.free_of);
  const rows = items.filter((i) => !i.free_of).map((i) => ({ ...i }));
  const orphans = [];
  offsets.forEach((o) => {
    const row = rows.find((r) => !r.free && r.description === o.free_of);
    if (row) row.free = true;
    else orphans.push(o);
  });
  return [...rows, ...orphans];
};

// الخدمات المجانية في فاتورة: [{ name, value }]
export const freeEntries = (items) =>
  (items ?? []).filter((i) => i.free_of).map((i) => ({ name: i.free_of, value: round2(-Number(i.qty) * Number(i.price)) }));
