import { useCallback } from 'react';
import { newId } from '../utils/id';
import { useSyncedState } from './useSyncedState';
import { getToday } from '../utils/format';

export const MOVEMENT_LABELS = {
  purchase: 'شراء',
  purchase_edit: 'تعديل فاتورة شراء',
  purchase_delete: 'حذف فاتورة شراء',
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
  const [purchases, setPurchases, { loading: purchasesLoading }] = useSyncedState('purchases', [], enabled);
  const [movements, setMovements, { loading: movementsLoading }] = useSyncedState('movements', [], enabled);

  const log = useCallback((entries) => {
    if (entries.length === 0) return;
    const stamp = newId();
    setMovements((prev) => [
      // by: من نفّذ الحركة (يُثبَّت أيضاً من الخادم)
      ...entries.map((e, i) => ({ id: `${stamp}-${i}`, date: getToday(), ...userStamp(currentUser), ...e })),
      ...prev,
    ]);
  }, [currentUser]);

  // يتحقق من بنود الشراء ويجهّزها دون تغيير أي شيء (يرمي Error برسالة جاهزة عند أول خطأ).
  // يعيد لكل بند: { kind: 'supply'|'aid', line, qty, unitCost, name, current? (موجود) | data/isNew (جديد) }
  const prepareLines = useCallback(
    (lines) => {
        const prepared = lines.map((line, i) => {
          const label = lines.length > 1 ? ` (البند ${i + 1})` : '';
          const qty = Number(line.qty);
          const unitCost = Number(line.unitCost) || 0;
          const isAid = Boolean(line.newAid || line.aidId);

          if (isAid) {
            if (!Number.isInteger(qty) || qty < 1) throw new Error(`كمية السماعات يجب أن تكون واحداً أو أكثر${label}.`);
            if (line.newAid) {
              const data = { brand: String(line.newAid.brand ?? '').trim(), model: String(line.newAid.model ?? '').trim(), type: line.newAid.type, price: Number(line.newAid.price) || 0 };
              if (!data.brand || !data.model) throw new Error(`أدخل الماركة والموديل للسماعة الجديدة${label}.`);
              return { kind: 'aid', line, qty, unitCost, data, name: aidName(data) };
            }
            const current = hearingAids.items.find((a) => String(a.id) === String(line.aidId));
            if (!current) throw new Error(`موديل السماعة المختار غير موجود${label}.`);
            return { kind: 'aid', line, qty, unitCost, current, name: aidName(current) };
          }

          if (!Number.isFinite(qty) || qty <= 0) throw new Error(`الكمية يجب أن تكون أكبر من صفر${label}.`);
          if (line.newItem) {
            const name = String(line.newItem.name ?? '').trim();
            if (!name) throw new Error(`أدخل اسم الصنف الجديد${label}.`);
            return { kind: 'supply', line, qty, unitCost, name, unit: line.newItem.unit, isNew: true };
          }
          const current = supplies.items.find((s) => String(s.id) === String(line.supplyId));
          if (!current) throw new Error(`الصنف المختار غير موجود${label}.`);
          return { kind: 'supply', line, qty, unitCost, name: current.name, unit: current.unit, current };
        });
      return prepared;
    },
    [supplies, hearingAids]
  );

  // lines (كل بند أحد الأشكال التالية، ويمكن الخلط بينها في فاتورة واحدة):
  //   مستلزم موجود: { supplyId, qty, unitCost }      مستلزم جديد: { newItem: { name, unit, price }, qty, unitCost }
  //   سماعة موجودة: { aidId, qty, unitCost, serials } سماعة جديدة: { newAid: { brand, model, type, price }, qty, unitCost, serials }
  // تُفحص كل البنود قبل تغيير أي شيء حتى لا يُدخَل جزء منها فقط عند وجود خطأ (ترمي Error برسالة جاهزة).
  const receivePurchase = useCallback(
    ({ supplier, supplierId, date, notes, lines }) => {
      const supplierRecord = suppliers.items.find((s) => String(s.id) === String(supplierId));
      const supplierName = supplier || supplierRecord?.name || '';
      if (!supplierName) throw new Error('يجب اختيار المورد.');
      if (!lines?.length) throw new Error('أضف بنداً واحداً على الأقل.');

      const no = nextPurchaseNo(purchases);
      const generalNote = notes || '';
      const hasCost = (v) => v !== '' && v != null;

      // 1) التحقق من كل البنود وتجهيزها
      const prepared = prepareLines(lines);

      // 2) تطبيقها على المخزون
      const items = [];
      const entries = [];
      const serialNotes = [];

      prepared.forEach((p) => {
        if (p.kind === 'supply') {
          let id;
          if (p.isNew) {
            // صنف جديد يُنشأ برصيد الشراء نفسه
            id = supplies.add({ name: p.name, unit: p.unit, price: Number(p.line.newItem.price) || 0, cost: p.unitCost, stock: p.qty });
          } else {
            id = p.current.id;
            supplies.patch(id, (s) => ({ stock: s.stock + p.qty, cost: p.unitCost }));
          }
          items.push({ supply_id: id, name: p.name, unit: p.unit, qty: p.qty, unit_cost: p.unitCost });
          entries.push({ supply_id: id, supply_name: p.name, type: 'purchase', qty: p.qty, note: `${no} — ${supplierName}` });
          return;
        }

        let id;
        if (p.data) {
          id = hearingAids.add({ ...p.data, stock: p.qty, ...(hasCost(p.line.unitCost) ? { cost: p.unitCost } : {}) });
        } else {
          id = p.current.id;
          hearingAids.patch(id, (a) => ({ stock: (a.stock ?? 0) + p.qty, ...(hasCost(p.line.unitCost) ? { cost: p.unitCost } : {}) }));
        }
        const serialText = p.line.serials ? `أرقام تسلسلية: ${p.line.serials}` : '';
        if (serialText) serialNotes.push(prepared.length > 1 ? `${p.name} — ${serialText}` : serialText);
        items.push({ item_type: 'hearing_aid', hearing_aid_id: id, name: p.name, unit: 'قطعة', qty: p.qty, unit_cost: p.unitCost, ...(p.line.serials ? { serials: p.line.serials } : {}) });
        entries.push({
          supply_id: id,
          supply_name: p.name,
          item_type: 'hearing_aid',
          type: 'purchase',
          qty: p.qty,
          note: [no, `المورد: ${supplierName}`, hasCost(p.line.unitCost) && `تكلفة الوحدة ${p.unitCost} د.أ`, serialText, generalNote].filter(Boolean).join(' — '),
        });
      });

      const purchase = {
        id: newId(),
        no,
        date: date || getToday(),
        supplier: supplierName,
        supplier_id: supplierRecord?.id ?? supplierId ?? null,
        notes: [...serialNotes, generalNote].filter(Boolean).join(' — '),
        items,
        total: Math.round(items.reduce((sum, i) => sum + i.qty * i.unit_cost, 0) * 100) / 100,
        ...(currentUser ? { created_by: currentUser.name || currentUser.username, created_by_username: currentUser.username } : {}),
      };

      setPurchases((prev) => [purchase, ...prev]);
      log(entries);
      return purchase;
    },
    [purchases, supplies, hearingAids, suppliers, setPurchases, log, currentUser, prepareLines]
  );

  // تعديل فاتورة شراء مسجَّلة. تُحتسب الفروق بين البنود القديمة والجديدة لكل صنف وتُطبَّق على المخزون
  // (زيادة أو نقص)، وتُسجَّل حركة «تعديل فاتورة شراء» لكل صنف تغيّرت كميته. البنود: بنفس شكل receivePurchase.
  // تُفحص الأرصدة قبل أي تغيير: لا يمكن خفض كمية صنف إن كان رصيده الحالي لا يكفي (بيع/استُهلك جزء منه).
  const updatePurchase = useCallback(
    (purchaseId, { supplier, supplierId, date, notes, lines }) => {
      const old = purchases.find((p) => p.id === purchaseId);
      if (!old) throw new Error('فاتورة الشراء غير موجودة.');
      const supplierRecord = suppliers.items.find((s) => String(s.id) === String(supplierId));
      const supplierName = supplier || supplierRecord?.name || old.supplier;
      if (!supplierName) throw new Error('يجب اختيار المورد.');
      if (!lines?.length) throw new Error('أضف بنداً واحداً على الأقل.');

      const prepared = prepareLines(lines);
      const hasCost = (v) => v !== '' && v != null;
      const keyOf = (type, id) => `${type}:${id}`;

      // الكميات القديمة والجديدة لكل صنف موجود (البنود الجديدة كلياً لا مفتاح لها)
      const oldQty = new Map();
      const oldCost = new Map();
      old.items.forEach((it) => {
        const key = it.item_type === 'hearing_aid' ? keyOf('aid', it.hearing_aid_id) : keyOf('supply', it.supply_id);
        oldQty.set(key, (oldQty.get(key) ?? 0) + (Number(it.qty) || 0));
        oldCost.set(key, Number(it.unit_cost) || 0);
      });
      const newQty = new Map();
      prepared.forEach((p) => {
        if (p.isNew || p.data) return;
        const key = keyOf(p.kind === 'aid' ? 'aid' : 'supply', p.current.id);
        newQty.set(key, (newQty.get(key) ?? 0) + p.qty);
      });

      const findItem = (key) => {
        const [type, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
        return type === 'aid' ? { type, item: hearingAids.items.find((a) => String(a.id) === id) } : { type, item: supplies.items.find((x) => String(x.id) === id) };
      };
      const nameOf = ({ type, item }) => (type === 'aid' ? aidName(item) : item.name);

      // 1) فحص الأرصدة قبل التعديل (الصنف المحذوف من المخزون يُتجاوز: لا رصيد له ليُعدَّل)
      const deltas = [];
      new Set([...oldQty.keys(), ...newQty.keys()]).forEach((key) => {
        const delta = (newQty.get(key) ?? 0) - (oldQty.get(key) ?? 0);
        if (delta === 0) return;
        const found = findItem(key);
        if (!found.item) return;
        if (delta < 0 && (Number(found.item.stock) || 0) + delta < 0) {
          throw new Error(`لا يمكن خفض كمية «${nameOf(found)}» بمقدار ${-delta}: رصيدها الحالي ${Number(found.item.stock) || 0} فقط (بيع أو استُهلك جزء منها).`);
        }
        deltas.push({ key, delta, ...found });
      });

      // 2) التطبيق على المخزون
      const entries = [];
      const noteFor = (extra) => [`تعديل الفاتورة ${old.no}`, `المورد: ${supplierName}`, extra].filter(Boolean).join(' — ');
      deltas.forEach(({ key, delta, type, item }) => {
        const list = type === 'aid' ? hearingAids : supplies;
        list.patch(item.id, (x) => ({ stock: Math.max(0, (Number(x.stock) || 0) + delta) }));
        entries.push({
          supply_id: item.id,
          supply_name: nameOf({ type, item }),
          ...(type === 'aid' ? { item_type: 'hearing_aid' } : {}),
          type: 'purchase_edit',
          qty: delta,
          note: noteFor(`الكمية من ${oldQty.get(key) ?? 0} إلى ${newQty.get(key) ?? 0}`),
        });
      });

      const items = [];
      prepared.forEach((p) => {
        const isAid = p.kind === 'aid';
        let id;
        if (p.isNew || p.data) {
          // صنف أو موديل جديد يُنشأ برصيد البند نفسه
          if (isAid) id = hearingAids.add({ ...p.data, stock: p.qty, ...(hasCost(p.line.unitCost) ? { cost: p.unitCost } : {}) });
          else id = supplies.add({ name: p.name, unit: p.unit, price: Number(p.line.newItem.price) || 0, cost: p.unitCost, stock: p.qty });
          entries.push({
            supply_id: id,
            supply_name: p.name,
            ...(isAid ? { item_type: 'hearing_aid' } : {}),
            type: 'purchase_edit',
            qty: p.qty,
            note: noteFor('صنف مضاف إلى الفاتورة'),
          });
        } else {
          id = p.current.id;
          const key = keyOf(isAid ? 'aid' : 'supply', id);
          // يتغير سعر التكلفة المسجَّل للصنف فقط إذا عُدِّل سعر الشراء في هذه الفاتورة
          if (hasCost(p.line.unitCost) && p.unitCost !== oldCost.get(key)) {
            (isAid ? hearingAids : supplies).patch(id, () => ({ cost: p.unitCost }));
          }
        }
        items.push(
          isAid
            ? { item_type: 'hearing_aid', hearing_aid_id: id, name: p.name, unit: 'قطعة', qty: p.qty, unit_cost: p.unitCost, ...(p.line.serials ? { serials: p.line.serials } : {}) }
            : { supply_id: id, name: p.name, unit: p.unit ?? 'قطعة', qty: p.qty, unit_cost: p.unitCost }
        );
      });

      const updated = {
        ...old,
        date: date || old.date,
        supplier: supplierName,
        supplier_id: supplierRecord?.id ?? supplierId ?? old.supplier_id ?? null,
        notes: notes || '',
        items,
        total: Math.round(items.reduce((sum, i) => sum + i.qty * i.unit_cost, 0) * 100) / 100,
        ...(currentUser ? { edited_by: currentUser.name || currentUser.username, edited_by_username: currentUser.username } : {}),
        edited_at: getToday(),
      };
      setPurchases((prev) => prev.map((p) => (p.id === purchaseId ? updated : p)));
      log(entries);
      return updated;
    },
    [purchases, supplies, hearingAids, suppliers, setPurchases, log, currentUser, prepareLines]
  );

  // حذف فاتورة شراء: تُخصم كميات بنودها من المخزون وتُسجَّل حركة «حذف فاتورة شراء» لكل صنف.
  // تُفحص الأرصدة أولاً: إن لم يكفِ رصيد صنف (لأن جزءاً منه بيع أو استُهلك) يُرفض الحذف كاملاً. الصنف المحذوف من المخزون يُتجاوز.
  const deletePurchase = useCallback(
    (purchaseId) => {
      const old = purchases.find((p) => p.id === purchaseId);
      if (!old) throw new Error('فاتورة الشراء غير موجودة.');

      const totals = new Map();
      old.items.forEach((it) => {
        const isAid = it.item_type === 'hearing_aid';
        const id = isAid ? it.hearing_aid_id : it.supply_id;
        const key = `${isAid ? 'aid' : 'supply'}:${id}`;
        const prev = totals.get(key) ?? { isAid, id, qty: 0 };
        totals.set(key, { ...prev, qty: prev.qty + (Number(it.qty) || 0) });
      });

      const targets = [];
      totals.forEach(({ isAid, id, qty }) => {
        const item = (isAid ? hearingAids.items : supplies.items).find((x) => String(x.id) === String(id));
        if (!item || qty === 0) return;
        const name = isAid ? aidName(item) : item.name;
        const stock = Number(item.stock) || 0;
        if (stock < qty) {
          throw new Error(`لا يمكن حذف الفاتورة: كمية «${name}» فيها ${qty} ورصيدها الحالي ${stock} فقط (بيع أو استُهلك جزء منها).`);
        }
        targets.push({ isAid, item, name, qty });
      });

      const entries = targets.map(({ isAid, item, name, qty }) => {
        (isAid ? hearingAids : supplies).patch(item.id, (x) => ({ stock: Math.max(0, (Number(x.stock) || 0) - qty) }));
        return {
          supply_id: item.id,
          supply_name: name,
          ...(isAid ? { item_type: 'hearing_aid' } : {}),
          type: 'purchase_delete',
          qty: -qty,
          note: [`حذف الفاتورة ${old.no}`, `المورد: ${old.supplier}`].filter(Boolean).join(' — '),
        };
      });

      setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
      log(entries);
      return old;
    },
    [purchases, supplies, hearingAids, setPurchases, log]
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

  // إدخال سماعات للمخزون من نافذة المخزون: بند واحد أو عدة بنود تُسجَّل كفاتورة شراء واحدة (عبر receivePurchase).
  // البيانات: { items: [{ aidId | newAid, qty, unitCost, serials }], supplierId, notes } والشكل القديم لبند واحد ما زال مقبولاً.
  // يعيد { name, qty, lines, purchase }.
  const receiveHearingAids = useCallback(
    ({ items, aidId, newAid, qty, unitCost, supplierId, serials, notes }) => {
      const supplierRecord = suppliers.items.find((s) => String(s.id) === String(supplierId));
      if (!supplierRecord) throw new Error('يجب اختيار مورد مسجل لإدخال السماعات.');
      const rawLines = items?.length ? items : [{ aidId, newAid, qty, unitCost, serials }];
      const purchase = receivePurchase({ supplier: supplierRecord.name, supplierId: supplierRecord.id, notes, lines: rawLines });
      const totalQty = purchase.items.reduce((t, it) => t + it.qty, 0);
      return { name: purchase.items.length === 1 ? purchase.items[0].name : `${purchase.items.length} بنود`, qty: totalQty, lines: purchase.items.length, purchase };
    },
    [receivePurchase, suppliers]
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

  return { loading: purchasesLoading || movementsLoading, purchases, movements, recordRemoval, receivePurchase, updatePurchase, deletePurchase, applyCount, consume, adjustUsage, sell, receiveHearingAids, sellHearingAid, returnHearingAid };
}
