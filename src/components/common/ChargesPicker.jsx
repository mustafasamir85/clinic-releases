import { useState } from 'react';
import { Briefcase, Package, Plus, Trash2 } from 'lucide-react';
import { Panel } from './layout';
import { COLORS, iconButtonStyle } from '../../styles';
import { formatMoney } from '../../utils/format';
import { isOfferRunning, offerValueText, withOffer } from '../../features/offers/offerUtils';
import { FREE_TEXT, freeOffsetItem } from '../../features/freeServices/freeUtils';

export const EMPTY_CHARGES = { procedures: [], supplies: [] };

// الإجراء المجاني (p.free) لا يدخل في الإجمالي المستحق
export const chargesTotal = (c) =>
  c.procedures.reduce((sum, p) => sum + (p.free ? 0 : Number(p.price || 0)), 0) +
  c.supplies.reduce((sum, s) => sum + Number(s.price || 0) * s.qty, 0);

export const hasCharges = (c) => c.procedures.length > 0 || c.supplies.length > 0;

// نصوص تُحفظ في سجل الزيارة
export const proceduresText = (c) => c.procedures.map((p) => (p.free ? `${p.name} (${FREE_TEXT})` : p.name)).join(' ، ');
export const suppliesText = (c) => c.supplies.map((s) => `${s.name} ×${s.qty}`).join(' ، ');

// بنود الفاتورة من الإجراءات والمستلزمات
export const chargesItems = (c) => [
  ...c.procedures.flatMap((p) => [
    { description: p.name, qty: 1, price: Number(p.price) },
    ...(p.free && Number(p.price) > 0 ? [freeOffsetItem({ id: p.id, name: p.name, price: p.price })] : []),
  ]),
  ...c.supplies.map((s) => ({ description: s.name, qty: s.qty, price: Number(s.price) })),
];

// عنصر الفاتورة التلقائية (null إذا لم تُضف إجراءات أو مستلزمات)
export const toInvoiceItem = (c) =>
  hasCharges(c)
    ? {
        service: [...c.procedures.map((p) => (p.free ? `${p.name} (${FREE_TEXT})` : p.name)), ...c.supplies.map((s) => `${s.name} ×${s.qty}`)].join(' + '),
        total: chargesTotal(c),
        items: chargesItems(c),
        charges: c, // نحتفظ بالتفاصيل المنظّمة لتُحفظ في الزيارة وتُعدَّل لاحقاً
      }
    : null;

const boxStyle = {
  background: COLORS.card,
  padding: '16px',
  borderRadius: '14px',
  border: `1px solid ${COLORS.border}`,
  marginBottom: '16px',
};
const panelInnerStyle = { background: 'transparent', border: 'none', padding: 0, marginBottom: '16px' };
const titleStyle = { fontSize: '13px', fontWeight: '800', color: COLORS.ink, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' };
const itemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.white, padding: '8px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px' };

// اختيار الإجراءات الطبية والمستلزمات المستخدمة في الزيارة (تُحسب في الفاتورة وتُخصم من المخزون)
// procedures: خدمات القسم، supplies: قائمة المخزون
export default function ChargesPicker({ procedures, supplies, value, onChange, offers = [], services = [] }) {
  const [procId, setProcId] = useState('');
  const [suppId, setSuppId] = useState('');
  const [qty, setQty] = useState('1');
  const [error, setError] = useState('');

  const addProcedure = () => {
    const proc = procedures.find((p) => String(p.id) === procId);
    if (!proc || value.procedures.some((p) => p.id === proc.id)) return;
    onChange({ ...value, procedures: [...value.procedures, { id: proc.id, name: proc.name, price: proc.price }] });
    setProcId('');
  };

  const toggleFree = (id) =>
    onChange({ ...value, procedures: value.procedures.map((p) => (p.id === id ? { ...p, free: !p.free } : p)) });

  const removeProcedure = (id) =>
    onChange({ ...value, procedures: value.procedures.filter((p) => p.id !== id) });

  const addSupply = () => {
    const item = supplies.find((s) => String(s.id) === suppId);
    const amount = Math.floor(Number(qty));
    if (!item || !(amount >= 1)) return;

    const already = value.supplies.find((s) => s.id === item.id)?.qty ?? 0;
    if (already + amount > item.stock) {
      setError(`الكمية المتوفرة من هذا الصنف ${item.stock} ${item.unit} فقط.`);
      return;
    }
    setError('');

    const next = already
      ? value.supplies.map((s) => (s.id === item.id ? { ...s, qty: s.qty + amount } : s))
      : [...value.supplies, { id: item.id, name: item.name, price: item.price, unit: item.unit, qty: amount }];
    onChange({ ...value, supplies: next });
    setSuppId('');
    setQty('1');
  };

  const removeSupply = (id) => onChange({ ...value, supplies: value.supplies.filter((s) => s.id !== id) });

  return (
    <div style={boxStyle}>
      <Panel title="الإجراءات الطبية المنفّذة" icon={Briefcase} style={panelInnerStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '4fr 1fr', gap: '10px' }}>
        <select value={procId} onChange={(e) => setProcId(e.target.value)} className="warm-select" style={{ margin: 0 }}>
          <option value="">اختر إجراءً من قائمة الخدمات...</option>
          {procedures.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {formatMoney(p.price)}</option>
          ))}
        </select>
        <button type="button" onClick={addProcedure} className="btn-warm-primary" style={{ height: '42px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Plus size={18} /> إضافة
        </button>
      </div>

      {value.procedures.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {value.procedures.map((p) => (
            <div key={p.id} style={itemStyle}>
              <div>
                <strong style={{ color: COLORS.ink }}>{p.name}</strong>
                <span style={{ color: COLORS.gold, marginRight: '8px', fontWeight: '700', textDecoration: p.free ? 'line-through' : 'none' }}>— {formatMoney(p.price)}</span>
                {p.free && <span style={{ color: COLORS.successText, marginRight: '6px', fontWeight: '800' }}>{FREE_TEXT}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: COLORS.successText }}>
                  <input type="checkbox" checked={Boolean(p.free)} onChange={() => toggleFree(p.id)} /> مجاني
                </label>
              <button type="button" onClick={() => removeProcedure(p.id)} aria-label="حذف الإجراء" style={iconButtonStyle(COLORS.danger)}>
                <Trash2 size={16} />
              </button>
              </div>
            </div>
          ))}
        </div>
      )}

      </Panel>

      <Panel title="المستلزمات الطبية المستخدمة" icon={Package} style={panelInnerStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr', gap: '10px' }}>
        <select value={suppId} onChange={(e) => { setSuppId(e.target.value); setError(''); }} className="warm-select" style={{ margin: 0 }}>
          <option value="">اختر مستلزماً من المخزون...</option>
          {supplies.map((s) => (
            <option key={s.id} value={s.id} disabled={s.stock <= 0}>
              {s.name} — متوفر {s.stock} {s.unit} — {formatMoney(s.price)}
            </option>
          ))}
        </select>
        <input type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} className="warm-input" placeholder="الكمية" style={{ margin: 0 }} />
        <button type="button" onClick={addSupply} className="btn-warm-primary" style={{ height: '42px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Plus size={18} /> إضافة
        </button>
      </div>
      {error && <span style={{ color: COLORS.danger, fontSize: '12px', fontWeight: '700', display: 'block', marginTop: '6px' }}>{error}</span>}

      {value.supplies.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {value.supplies.map((s) => (
            <div key={s.id} style={itemStyle}>
              <div>
                <strong style={{ color: COLORS.ink }}>{s.name}</strong>
                <span style={{ color: COLORS.gold, marginRight: '8px', fontWeight: '700' }}>
                  — {s.qty} {s.unit} × {formatMoney(s.price)} = {formatMoney(s.qty * s.price)}
                </span>
              </div>
              <button type="button" onClick={() => removeSupply(s.id)} aria-label="حذف المستلزم" style={iconButtonStyle(COLORS.danger)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      </Panel>

      {hasCharges(value) && offers.length > 0 && (() => {
        // العرض اختياري: "بدون عرض" هو الافتراضي. يظهر العرض المختار سابقاً حتى لو انتهى.
        const options = offers.filter((o) => isOfferRunning(o) || String(o.id) === String(value.offerId));
        const applied = withOffer(chargesItems(value), value.offerId, offers, services);
        return options.length === 0 ? null : (
          <div style={{ marginTop: '16px' }}>
            <label style={titleStyle}>🏷️ تطبيق عرض على فاتورة هذه الزيارة (اختياري)</label>
            <select value={value.offerId ?? ''} onChange={(e) => onChange({ ...value, offerId: e.target.value })} className="warm-select" style={{ margin: 0 }}>
              <option value="">بدون عرض</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.name} — خصم {offerValueText(o)}</option>
              ))}
            </select>
            {value.offerId && (
              <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', fontWeight: '700', color: applied.error ? COLORS.danger : COLORS.successText }}>
                {applied.error || `قيمة الخصم: ${formatMoney(applied.discount)}`}
              </span>
            )}
          </div>
        );
      })()}

      {hasCharges(value) && (
        <div style={{ marginTop: '16px', background: COLORS.soft, padding: '10px 16px', borderRadius: '10px', fontWeight: '800', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
          <span>إجمالي الإجراءات والمستلزمات (سيُصدر كفاتورة عند الحفظ)</span>
          <span style={{ color: COLORS.gold }}>{formatMoney(Math.round((chargesTotal(value) - withOffer(chargesItems(value), value.offerId, offers, services).discount) * 100) / 100)}</span>
        </div>
      )}
    </div>
  );
}
