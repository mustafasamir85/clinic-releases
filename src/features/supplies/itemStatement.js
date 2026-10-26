import { MOVEMENT_LABELS } from '../../hooks/useInventory';
import { formatUser } from '../../utils/format';

const typeOf = (m) => (m.item_type === 'hearing_aid' ? 'hearing_aid' : 'supply');
const inRange = (date, from, to) => Boolean(date) && (!from || date >= from) && (!to || date <= to);

// الأصناف التي يمكن إصدار كشف لها: المستلزمات والسماعات الحالية + أصناف محذوفة بقيت لها حركات.
export function statementItems({ supplies, hearingAids, movements }) {
  const items = [
    ...supplies.map((s) => ({ key: `supply:${s.id}`, type: 'supply', id: s.id, name: s.name, stock: Number(s.stock) || 0, deleted: false })),
    ...hearingAids.map((a) => ({ key: `hearing_aid:${a.id}`, type: 'hearing_aid', id: a.id, name: `سماعة ${a.brand} ${a.model}`, stock: Number(a.stock) || 0, deleted: false })),
  ];
  const known = new Set(items.map((i) => i.key));
  movements.forEach((m) => {
    const key = `${typeOf(m)}:${m.supply_id}`;
    if (known.has(key)) return;
    known.add(key);
    items.push({ key, type: typeOf(m), id: m.supply_id, name: m.supply_name, stock: 0, deleted: true });
  });
  return items;
}

// كشف حركة صنف خلال فترة. الرصيد يُحسب رجوعاً من الرصيد الحالي (الأصنف المحذوف رصيده 0)،
// فيتطابق الرصيد الأخير مع المخزون الفعلي دائماً حتى لو سبقت الحركات كميات ابتدائية.
// movements: الأحدث أولاً كما هي محفوظة.
export function itemStatement({ movements, item, from, to }) {
  const chrono = [...movements]
    .reverse()
    .filter((m) => typeOf(m) === item.type && String(m.supply_id) === String(item.id))
    .sort((a, b) => String(a.date).localeCompare(String(b.date))); // ترتيب مستقر: داخل اليوم الواحد يبقى ترتيب الحدوث

  const end = item.deleted ? 0 : item.stock;
  const fromOnward = chrono.filter((m) => !from || m.date >= from).reduce((t, m) => t + Number(m.qty), 0);
  const opening = end - fromOnward;

  let balance = opening;
  const rows = chrono
    .filter((m) => inRange(m.date, from, to))
    .map((m) => {
      const qty = Number(m.qty) || 0;
      balance += qty;
      return {
        id: m.id,
        date: m.date,
        type: m.type,
        label: MOVEMENT_LABELS[m.type] ?? m.type,
        note: m.note ?? '',
        user: formatUser(m.by, m.by_username),
        inQty: qty > 0 ? qty : 0,
        outQty: qty < 0 ? -qty : 0,
        balance,
      };
    });

  return {
    opening,
    rows,
    totalIn: rows.reduce((t, r) => t + r.inQty, 0),
    totalOut: rows.reduce((t, r) => t + r.outQty, 0),
    closing: balance,
    current: end,
  };
}
