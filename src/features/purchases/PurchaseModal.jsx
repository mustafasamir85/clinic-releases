import { useState } from 'react';
import { Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { SUPPLY_UNITS } from '../../constants';
import { COLORS, iconButtonStyle } from '../../styles';
import { formatMoney, getToday } from '../../utils/format';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';

const NEW_ITEM = '__new__';

const emptyLine = () => ({
  key: Math.random().toString(36).slice(2),
  supplyId: '',
  newName: '',
  newUnit: SUPPLY_UNITS[0],
  newPrice: '',
  qty: '',
  unitCost: '',
});

const lineTotal = (l) => (Number(l.qty) || 0) * (Number(l.unitCost) || 0);

// نموذج تسجيل مشتريات: بنود (صنف موجود أو صنف جديد) بكمية وسعر شراء.
// الحفظ يزيد المخزون ويسجّل الحركة.
export default function PurchaseModal({ supplies, suppliers, onSubmit, onClose }) {
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(getToday());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([emptyLine()]);

  const setLine = (key, changes) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  const removeLine = (key) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      supplierId: Number(supplierId),
      supplier: suppliers.find((s) => String(s.id) === supplierId)?.name ?? '',
      date,
      notes: notes.trim(),
      lines: lines.map((l) =>
        l.supplyId === NEW_ITEM
          ? { newItem: { name: l.newName, unit: l.newUnit, price: l.newPrice }, qty: l.qty, unitCost: l.unitCost }
          : { supplyId: l.supplyId, qty: l.qty, unitCost: l.unitCost }
      ),
    });
  };

  return (
    <Modal title="تسجيل مشتريات جديدة" icon={ShoppingCart} maxWidth={820} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <Field label="المورّد" required>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="warm-select" required autoFocus>
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
          الأصناف المشتراة
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lines.map((l) => {
            const isNew = l.supplyId === NEW_ITEM;
            return (
              <div key={l.key} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px' }}>
                <div className="purchase-line" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.2fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                  <select value={l.supplyId} onChange={(e) => setLine(l.key, { supplyId: e.target.value })} className="warm-select" style={{ margin: 0 }} required>
                    <option value="">اختر الصنف...</option>
                    {supplies.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} (الرصيد: {s.stock} {s.unit})</option>
                    ))}
                    <option value={NEW_ITEM}>＋ صنف جديد غير موجود في المخزون</option>
                  </select>
                  <input type="number" min="1" step="1" placeholder="الكمية" value={l.qty} onChange={(e) => setLine(l.key, { qty: e.target.value })} className="warm-input" style={{ margin: 0 }} required />
                  <input type="number" min="0" step="0.01" placeholder="سعر الشراء/وحدة" value={l.unitCost} onChange={(e) => setLine(l.key, { unitCost: e.target.value })} className="warm-input" style={{ margin: 0 }} required />
                  <strong style={{ fontSize: '13px', color: COLORS.gold, textAlign: 'center' }}>{formatMoney(lineTotal(l))}</strong>
                  <button type="button" onClick={() => removeLine(l.key)} disabled={lines.length === 1} aria-label="حذف البند" style={{ ...iconButtonStyle(COLORS.danger), opacity: lines.length === 1 ? 0.3 : 1 }}>
                    <Trash2 size={16} />
                  </button>
                </div>

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

        <FormActions onCancel={onClose} submitLabel="حفظ وإضافة للمخزون" />
      </form>
    </Modal>
  );
}
