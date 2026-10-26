import { Plus, Trash2 } from 'lucide-react';
import { COLORS, iconButtonStyle } from '../../styles';
import { formatMoney } from '../../utils/format';

let counter = 0;
export const newItem = () => ({ id: `n${Date.now()}-${counter++}`, description: '', qty: 1, price: '' });

// تنظيف البنود قبل الحفظ: حذف الفارغ وتحويل الأرقام. السعر السالب مسموح (بند خصم). تعيد [] إن لم يصلح شيء.
export const cleanItems = (items) =>
  items
    .map((i) => ({ id: i.id, description: String(i.description).trim(), qty: Number(i.qty), price: Number(i.price), ...(i.free ? { free: true } : {}) }))
    .filter((i) => i.description && i.qty > 0 && !Number.isNaN(i.price));

const total = (items) => items.reduce((t, i) => t + (i.free ? 0 : (Number(i.qty) || 0) * (Number(i.price) || 0)), 0);

// جدول بنود فاتورة قابل للتعديل: الوصف × الكمية × السعر
export default function InvoiceItemsEditor({ items, onChange, suggestions = [] }) {
  const update = (id, key, value) => onChange(items.map((i) => (i.id === id ? { ...i, [key]: value } : i)));
  const cell = { margin: 0, padding: '8px' };

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
      <div className="item-row item-row-head" style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 1.4fr 1.4fr 56px 32px', gap: '8px', fontSize: '12px', color: COLORS.muted, fontWeight: '700', marginBottom: '6px' }}>
        <span>البند / الخدمة</span><span>الكمية</span><span>السعر (د.أ)</span><span>المجموع</span><span>مجاني</span><span />
      </div>

      {/* اقتراحات بأسماء الخدمات: اختيار اسم خدمة يجعل عروضها تنطبق على البند */}
      <datalist id="invoice-item-suggestions">
        {suggestions.map((s) => <option key={s} value={s} />)}
      </datalist>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((i) => (
          <div key={i.id} className="item-row" style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 1.4fr 1.4fr 56px 32px', gap: '8px', alignItems: 'center' }}>
            <input type="text" className="warm-input" style={cell} value={i.description} onChange={(e) => update(i.id, 'description', e.target.value)} placeholder="وصف البند" aria-label="وصف البند" list="invoice-item-suggestions" />
            <input type="number" min="1" step="1" className="warm-input" style={cell} value={i.qty} onChange={(e) => update(i.id, 'qty', e.target.value)} aria-label="الكمية" />
            <input type="number" step="0.01" className="warm-input" style={cell} value={i.price} onChange={(e) => update(i.id, 'price', e.target.value)} aria-label="السعر" />
            <strong style={{ fontSize: '13px', color: COLORS.ink, textDecoration: i.free ? 'line-through' : 'none' }}>{formatMoney(Math.round((Number(i.qty) || 0) * (Number(i.price) || 0) * 100) / 100)}</strong>
            <label title="خدمة مجانية: لا يُحاسَب المريض عليها وتظهر في تقرير الخدمات المجانية" style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={Boolean(i.free)} onChange={(e) => update(i.id, 'free', e.target.checked)} aria-label="خدمة مجانية" />
            </label>
            <button type="button" onClick={() => onChange(items.filter((x) => x.id !== i.id))} disabled={items.length === 1} aria-label="حذف البند" style={{ ...iconButtonStyle(COLORS.danger), opacity: items.length === 1 ? 0.3 : 1 }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
        <button type="button" onClick={() => onChange([...items, newItem()])} style={{ background: 'transparent', border: `1px dashed ${COLORS.border}`, color: COLORS.gold, borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={14} /> إضافة بند
        </button>
        <strong style={{ fontSize: '14px' }}>الإجمالي: <span style={{ color: COLORS.gold }}>{formatMoney(Math.round(total(items) * 100) / 100)}</span></strong>
      </div>
    </div>
  );
}
