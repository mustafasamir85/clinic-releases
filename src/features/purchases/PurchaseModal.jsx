import { useState } from 'react';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { HEARING_AID_TYPES, SUPPLY_UNITS } from '../../constants';
import { COLORS, iconButtonStyle } from '../../styles';
import { formatMoney, getToday } from '../../utils/format';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';

// قيمة اختيار البند: '' | 'supply:<id>' | 'aid:<id>' | NEW_ITEM (مستلزم جديد) | NEW_AID (سماعة جديدة)
const NEW_ITEM = '__new__';
const NEW_AID = '__new_aid__';

const emptyLine = () => ({
  key: Math.random().toString(36).slice(2),
  choice: '',
  newName: '',
  newUnit: SUPPLY_UNITS[0],
  newPrice: '',
  newBrand: '',
  newModel: '',
  newType: HEARING_AID_TYPES[0],
  serials: '',
  qty: '',
  unitCost: '',
});

const isAidChoice = (c) => c === NEW_AID || c.startsWith('aid:');

// بند فاتورة موجودة -> بند في النموذج (للتعديل)
const lineFromItem = (it) => ({
  ...emptyLine(),
  choice: it.item_type === 'hearing_aid' ? `aid:${it.hearing_aid_id}` : `supply:${it.supply_id}`,
  qty: String(it.qty ?? ''),
  unitCost: String(it.unit_cost ?? ''),
  serials: it.serials ?? '',
  oldName: it.name, // لعرضه إن كان الصنف قد حُذف من المخزون
});

const lineTotal = (l) => (Number(l.qty) || 0) * (Number(l.unitCost) || 0);

// نموذج تسجيل مشتريات: بنود (مستلزم أو سماعة، موجود أو جديد) بكمية وسعر شراء، في فاتورة واحدة.
// الحفظ يزيد المخزون ويسجّل الحركة. مع purchase (فاتورة مسجَّلة) يصبح نموذج تعديل: يُحسب الفرق في الكميات ويُطبَّق على المخزون.
export default function PurchaseModal({ supplies, hearingAids = [], suppliers, purchase = null, onSubmit, onClose }) {
  const editing = Boolean(purchase);
  const [supplierId, setSupplierId] = useState(() => (purchase ? String(purchase.supplier_id ?? suppliers.find((s) => s.name === purchase.supplier)?.id ?? '') : ''));
  const [date, setDate] = useState(purchase?.date ?? getToday());
  const [notes, setNotes] = useState(purchase?.notes ?? '');
  const [lines, setLines] = useState(() => (purchase?.items?.length ? purchase.items.map(lineFromItem) : [emptyLine()]));

  const setLine = (key, changes) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  const removeLine = (key) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      supplierId: Number(supplierId) || supplierId,
      supplier: suppliers.find((s) => String(s.id) === supplierId)?.name ?? purchase?.supplier ?? '',
      date,
      notes: notes.trim(),
      lines: lines.map((l) => {
        const base = { qty: l.qty, unitCost: l.unitCost };
        if (l.choice === NEW_ITEM) return { ...base, newItem: { name: l.newName, unit: l.newUnit, price: l.newPrice } };
        if (l.choice === NEW_AID) return { ...base, newAid: { brand: l.newBrand, model: l.newModel, type: l.newType, price: l.newPrice }, serials: l.serials.trim() };
        if (l.choice.startsWith('aid:')) return { ...base, aidId: l.choice.slice(4), serials: l.serials.trim() };
        return { ...base, supplyId: l.choice.slice(7) };
      }),
    });
  };

  return (
    <Modal warnUnsaved title={editing ? `تعديل فاتورة الشراء ${purchase.no}` : 'تسجيل مشتريات جديدة'} icon={ShoppingCart} maxWidth={820} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {editing && (
          <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: COLORS.muted }}>
            عند الحفظ يُطبَّق الفرق بين الكميات القديمة والجديدة على المخزون ويُسجَّل في سجل الحركة. لا يمكن خفض كمية صنف إذا لم يكفِ رصيده الحالي.
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <Field label="المورّد" required>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="warm-select" required autoFocus={!editing}>
              <option value="">{suppliers.length ? 'اختر المورّد...' : 'لا يوجد موردون — أضف مورّداً من تبويب الموردين'}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="تاريخ الشراء" required>
            <input type="date" max={getToday()} value={date} onChange={(e) => setDate(e.target.value)} className="warm-input" required />
          </Field>
        </div>

        <span style={{ fontSize: '13px', fontWeight: '800', color: COLORS.ink, display: 'block', margin: '4px 0 10px 0' }}>
          الأصناف المشتراة (مستلزمات وسماعات)
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lines.map((l) => {
            const isNew = l.choice === NEW_ITEM;
            const isNewAid = l.choice === NEW_AID;
            const isAid = isAidChoice(l.choice);
            return (
              <div key={l.key} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px' }}>
                <div className="purchase-line" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.2fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                  <select value={l.choice} onChange={(e) => setLine(l.key, { choice: e.target.value })} className="warm-select" style={{ margin: 0 }} required>
                    <option value="">اختر الصنف...</option>
                    {l.oldName && !supplies.some((x) => `supply:${x.id}` === l.choice) && !hearingAids.some((a) => `aid:${a.id}` === l.choice) && (
                      <option value={l.choice} disabled>{l.oldName} (محذوف من المخزون)</option>
                    )}
                    <optgroup label="المستلزمات الطبية">
                      {supplies.map((s) => (
                        <option key={s.id} value={`supply:${s.id}`}>{s.name} (الرصيد: {s.stock} {s.unit})</option>
                      ))}
                      <option value={NEW_ITEM}>＋ مستلزم جديد غير موجود في المخزون</option>
                    </optgroup>
                    <optgroup label="السماعات">
                      {hearingAids.map((a) => (
                        <option key={a.id} value={`aid:${a.id}`}>سماعة {a.brand} {a.model} ({a.type}) (الرصيد: {a.stock ?? 0})</option>
                      ))}
                      <option value={NEW_AID}>＋ موديل سماعة جديد غير مسجَّل</option>
                    </optgroup>
                  </select>
                  <input type="number" min="1" step="1" placeholder="الكمية" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} className="warm-input" style={{ margin: 0 }} required />
                  <input type="number" min="0" step="0.01" placeholder="سعر الشراء/وحدة" value={l.unitCost} onChange={(e) => setLine(l.key, { unitCost: e.target.value })} className="warm-input" style={{ margin: 0 }} required />
                  <strong style={{ fontSize: '13px', color: COLORS.gold, textAlign: 'center' }}>{formatMoney(lineTotal(l))}</strong>
                  <button type="button" onClick={() => removeLine(l.key)} disabled={lines.length === 1} aria-label="حذف البند" style={{ ...iconButtonStyle(COLORS.danger), opacity: lines.length === 1 ? 0.3 : 1 }}>
                    <Trash2 size={16} />
                  </button>
                </div>

                {isNewAid && (
                  <div className="grid-2m" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                    <input type="text" placeholder="الماركة (Phonak)" value={l.newBrand} onChange={(e) => setLine(l.key, { newBrand: e.target.value })} className="warm-input" style={{ margin: 0 }} required />
                    <input type="text" placeholder="الموديل" value={l.newModel} onChange={(e) => setLine(l.key, { newModel: e.target.value })} className="warm-input" style={{ margin: 0 }} required />
                    <select value={l.newType} onChange={(e) => setLine(l.key, { newType: e.target.value })} className="warm-select" style={{ margin: 0 }}>
                      {HEARING_AID_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input type="number" min="0" step="0.01" placeholder="سعر البيع" value={l.newPrice} onChange={(e) => setLine(l.key, { newPrice: e.target.value })} className="warm-input" style={{ margin: 0 }} required />
                  </div>
                )}

                {isAid && (
                  <input type="text" placeholder="الأرقام التسلسلية (اختياري — افصل بينها بفاصلة، وتُحفظ في سجل الحركة)" value={l.serials} onChange={(e) => setLine(l.key, { serials: e.target.value })} className="warm-input" style={{ margin: '8px 0 0 0' }} />
                )}

                {isNew && (
                  <div className="grid-2m" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.2fr', gap: '8px', marginTop: '8px' }}>
                    <input type="text" placeholder="اسم الصنف الجديد" value={l.newName} onChange={(e) => setLine(l.key, { newName: e.target.value })} className="warm-input" style={{ margin: 0 }} required />
                    <select value={l.newUnit} onChange={(e) => setLine(l.key, { newUnit: e.target.value })} className="warm-select" style={{ margin: 0 }}>
                      {SUPPLY_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <input type="number" min="0" step="0.01" placeholder="سعر البيع/وحدة" value={l.newPrice} onChange={(e) => setLine(l.key, { newPrice: e.target.value })} className="warm-input" style={{ margin: 0 }} required />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine()])} style={{ marginTop: '10px', background: 'transparent', border: `1px dashed ${COLORS.gold}`, color: COLORS.gold, borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={14} /> إضافة بند
        </button>

        <Field label="ملاحظات" optional style={{ marginTop: '16px' }}>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="warm-input" placeholder="رقم فاتورة المورّد أو أي ملاحظة..." />
        </Field>

        <div style={{ background: COLORS.soft, padding: '10px 16px', borderRadius: '10px', fontWeight: '800', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
          <span>إجمالي المشتريات</span>
          <span style={{ color: COLORS.gold }}>{formatMoney(Math.round(total * 100) / 100)}</span>
        </div>

        <FormActions onCancel={onClose} submitLabel={editing ? 'حفظ التعديلات' : 'حفظ وإضافة للمخزون'} />
      </form>
    </Modal>
  );
}
