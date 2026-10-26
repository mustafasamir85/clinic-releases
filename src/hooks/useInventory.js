import { useCallback } from 'react';
import { newId } from '../utils/id';
import { useSyncedState } from './useSyncedState';
import { getToday } from '../utils/format';

export const MOVEMENT_LABELS = {
  purchase: 'شراء',
  adjustment: 'تسوية جرد',
  usage: 'استهلاك',
  return: 'إرجاع للمخزون',
  sale: 'بيع',
  receipt: 'إدخال للمخزون',
  removal: 'حذف الصنف',
};

const aidName = (aid) => `سماعة ${aid.brand} ${aid.model}`;
const userStamp = (u) => (u ? { by: u.name || u.username, by_username: u.username } : {});

const nextPurchaseNo = (purchases) => {
  const max = purchases.reduce((m, p) => {
    const n = parseInt(String(p.no || '').match(/(\d+)$/)?.[1], 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `PUR-${new Date().getFullYear()}-${String(max + 1).padStart(3, '0')}`;
};

// إدارة المخزون: كل تغيير في الكميات (شراء / جرد / استهلاك) يمر من هنا
// فيُسجَّل في سجل الحركة. supplies = نتيجة useCrudList لقائمة المستلزمات.
// supplies / hearingAids = نتيجة useCrudList. حركات السماعات تُسجَّل في نفس سجل الحركة (item_type: 'hearing_aid').
export function useInventory(supplies, enabled, hearingAids, suppliers, currentUser = null) {
  const [purchases, setPurchases] = useSyncedState('purchases', [], enabled);
  const [movements, setMovements] = useSyncedState('movements', [], enabled);

  const log = useCallback((entries) => {
    if (entries.length === 0) return;
    const stamp = newId();
    setMovements((prev) => [
      // by: من نفّذ الحركة (يُثبَّت أيضاً من الخادم)
      ...entries.map((e, i) => ({ id: `${stamp}-${i}`, date: getToday(), ...userStamp(currentUser), ...e })),
      ...prev,
    ]);
  }, [currentUser]);

  // lines: [{ supplyId, qty, unitCost }] أو [{ newItem: { name, unit, price }, qty, unitCost }]
  const receivePurchase = useCallback(
    ({ supplier, supplierId, date, notes, lines }) => {
      const no = nextPurchaseNo(purchases);
      const items = [];
      const entries = [];

      lines.forEach((line) => {
        const qty = Number(line.qty);
        const unitCost = Number(line.unitCost);
        let id;
        let name;
        let unit;

        if (line.newItem) {
          // صنف جديد يُنشأ برصيد الشراء نفسه
          name = line.newItem.name.trim();
          unit = line.newItem.unit;
          id = supplies.add({ name, unit, price: Number(line.newItem.price) || 0, cost: unitCost, stock: qty });
        } else {
          const current = supplies.items.find((s) => String(s.id) === String(line.supplyId));
          if (!current) return;
          id = current.id;
          name = current.name;
          unit = current.unit;
          supplies.patch(id, (s) => ({ stock: s.stock + qty, cost: unitCost }));
        }

        items.push({ supply_id: id, name, unit, qty, unit_cost: unitCost });
        entries.push({ supply_id: id, supply_name: name, type: 'purchase', qty, note: `${no} — ${supplier}` });
      });

      const purchase = {
        id: newId(),
        no,
        date: date || getToday(),
        supplier,
        supplier_id: supplierId ?? null,
        notes,
        items,
        total: Math.round(items.reduce((sum, i) => sum + i.qty * i.unit_cost, 0) * 100) / 100,
        ...(currentUser ? { created_by: currentUser.name || currentUser.username, created_by_username: currentUser.username } : {}),
      };

      setPurchases((prev) => [purchase, ...prev]);
      log(entries);
      return purchase;
    },
    [purchases, supplies, log, currentUser]
  );

  // counts: [{ id, counted }] — الكمية الفعلية بعد العدّ. تُطبَّق الأصناف المختلفة فقط. تعيد عددها.
  const applyCount = useCallback(
    (counts, reason) => {
      const entries = [];
      counts.forEach(({ id, counted }) => {
        const current = supplies.items.find((s) => s.id === id);
        if (!current) return;
        const diff = counted - current.stock;
        if (diff === 0) return;
        supplies.patch(id, () => ({ stock: counted }));
        entries.push({ supply_id: id, supply_name: current.name, type: 'adjustment', qty: diff, note: reason || 'جرد' });
      });
      log(entries);
      return entries.length;
    },
    [supplies, log]
  );

  // خصم المستلزمات المستخدمة في زيارة. items: [{ id, name, qty }]
  const consume = useCallback(
    (items, note) => {
      const entries = items.map(({ id, name, qty }) => {
        supplies.patch(id, (s) => ({ stock: Math.max(0, s.stock - qty) }));
        return { supply_id: id, supply_name: name, type: 'usage', qty: -qty, note };
      });
      log(entries);
    },
    [supplies, log]
  );

  // تعديل استهلاك زيارة. deltas: [{ id, name, qty }] — qty موجب = استهلاك إضافي، سالب = إرجاع للمخزون
  const adjustUsage = useCallback(
    (deltas, note) => {
      const entries = [];
      deltas.forEach(({ id, name, qty }) => {
        if (!qty) return;
        supplies.patch(id, (s) => ({ stock: Math.max(0, s.stock - qty) }));
        entries.push({ supply_id: id, supply_name: name, type: qty > 0 ? 'usage' : 'return', qty: -qty, note });
      });
      log(entries);
    },
    [supplies, log]
  );

  // بيع مستلزمات مباشر (بدون زيارة). items: [{ id, name, qty }]
  const sell = useCallback(
    (items, note) => {
      const entries = items.map(({ id, name, qty }) => {
        supplies.patch(id, (s) => ({ stock: Math.max(0, s.stock - qty) }));
        return { supply_id: id, supply_name: name, type: 'sale', qty: -qty, note };
      });
      log(entries);
    },
    [supplies, log]
  );

  // إدخال سماعات للمخزون. aid = { id } لموديل موجود أو { newAid: { brand, model, type, price } } لموديل جديد
  // يسجّل الإضافة أيضاً كفاتورة شراء مرتبطة بالمورد، ويعيد { name, qty, purchase }.
  const receiveHearingAids = useCallback(
    ({ aidId, newAid, qty, unitCost, supplierId, serials, notes }) => {
      const count = Number(qty);
      const supplierRecord = suppliers.items.find((s) => String(s.id) === String(supplierId));
      if (!supplierRecord) throw new Error('يجب اختيار مورد مسجل لإدخال السماعات.');
      if (!Number.isInteger(count) || count < 1) throw new Error('كمية السماعات يجب أن تكون واحداً أو أكثر.');

      let id;
      let name;
      if (newAid) {
        const data = { brand: newAid.brand.trim(), model: newAid.model.trim(), type: newAid.type, price: Number(newAid.price) || 0 };
        id = hearingAids.add({ ...data, stock: count, ...(unitCost !== '' && unitCost != null ? { cost: Number(unitCost) } : {}) });
        name = aidName(data);
      } else {
        const current = hearingAids.items.find((a) => String(a.id) === String(aidId));
        if (!current) return null;
        id = current.id;
        name = aidName(current);
        hearingAids.patch(id, (a) => ({
          stock: (a.stock ?? 0) + count,
          ...(unitCost !== '' && unitCost != null ? { cost: Number(unitCost) } : {}),
        }));
      }
      const purchaseNo = nextPurchaseNo(purchases);
      const cost = Number(unitCost) || 0;
      const note = [
        serials && `أرقام تسلسلية: ${serials}`,
        notes,
      ]
        .filter(Boolean)
        .join(' — ');
      const purchase = {
        id: newId(),
        no: purchaseNo,
        date: getToday(),
        supplier: supplierRecord.name,
        supplier_id: supplierRecord.id,
        notes: note,
        items: [{
          item_type: 'hearing_aid',
          hearing_aid_id: id,
          name,
          unit: 'قطعة',
          qty: count,
          unit_cost: cost,
        }],
        total: Math.round(count * cost * 100) / 100,
        ...(currentUser ? { created_by: currentUser.name || currentUser.username, created_by_username: currentUser.username } : {}),
      };
      setPurchases((prev) => [purchase, ...prev]);

      const movementNote = [
        purchaseNo,
        `المورد: ${supplierRecord.name}`,
        unitCost !== '' && unitCost != null && `تكلفة الوحدة ${Number(unitCost)} د.أ`,
        note,
      ]
        .filter(Boolean)
        .join(' — ');
      log([{ supply_id: id, supply_name: name, item_type: 'hearing_aid', type: 'purchase', qty: count, note: movementNote }]);
      return { name, qty: count, purchase };
    },
    [hearingAids, log, suppliers, purchases, setPurchases, currentUser]
  );

  // بيع سماعة من المخزون (1 قطعة) أو إرجاعها عند إلغاء البيع
  const adjustHearingAid = useCallback(
    (aidId, delta, type, note) => {
      const current = hearingAids.items.find((a) => String(a.id) === String(aidId));
      if (!current) return;
      hearingAids.patch(current.id, (a) => ({ stock: Math.max(0, (a.stock ?? 0) + delta) }));
      log([{ supply_id: current.id, supply_name: aidName(current), item_type: 'hearing_aid', type, qty: delta, note }]);
    },
    [hearingAids, log]
  );
  const sellHearingAid = useCallback((aidId, note) => adjustHearingAid(aidId, -1, 'sale', note), [adjustHearingAid]);
  const returnHearingAid = useCallback((aidId, note) => adjustHearingAid(aidId, 1, 'return', note), [adjustHearingAid]);

  // حذف صنف (مستلزم أو موديل سماعة) من القوائم: تُسجَّل حركة بما كان متوفراً منه ومن حذفه، فيبقى له كشف حركة
  const recordRemoval = useCallback(
    (item, itemType = 'supply') =>
      log([
        {
          supply_id: item.id,
          supply_name: itemType === 'hearing_aid' ? aidName(item) : item.name,
          ...(itemType === 'hearing_aid' ? { item_type: 'hearing_aid' } : {}),
          type: 'removal',
          qty: -(Number(item.stock) || 0),
          note: 'حذف الصنف من القائمة',
        },
      ]),
    [log]
  );

  return { purchases, movements, recordRemoval, receivePurchase, applyCount, consume, adjustUsage, sell, receiveHearingAids, sellHearingAid, returnHearingAid };
}
