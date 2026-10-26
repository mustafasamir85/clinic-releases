import { useMemo, useState } from 'react';
import { Eye, Plus, Search, Store, Trash2, X } from 'lucide-react';
import { INVOICE_STATUS, LOW_STOCK_THRESHOLD } from '../../constants';
import { COLORS, smallOutlineButtonStyle } from '../../styles';
import { formatDateDMY, formatMoney, getFileNumber } from '../../utils/format';
import { handleEnterAsTab } from '../../utils/form';
import { Panel, ListRow, SectionHeader, TabCard } from '../../components/common/layout';
import Field from '../../components/common/Field';
import Autocomplete from '../../components/common/Autocomplete';
import PatientSearch from '../../components/common/PatientSearch';
import StatusBadge from '../../components/common/StatusBadge';

export const SALE_SOURCE = 'supply_sale'; // قيمة invoice.source لفواتير بيع المستلزمات

const round2 = (n) => Math.round(n * 100) / 100;
const HISTORY_LIMIT = 50;

const getSupplyText = (s) => s.name;
const renderSupply = (s) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
    <span>📦 {s.name}</span>
    <span style={{ fontSize: '12px', color: s.stock < LOW_STOCK_THRESHOLD ? COLORS.danger : COLORS.successText, fontWeight: '800' }}>
      المتوفر: {s.stock} {s.unit} • {formatMoney(s.price)}
    </span>
  </div>
);

// بيع المستلزمات الطبية مباشرة (لمريض مسجَّل أو عميل بيع مباشر): يصدر فاتورة ويخصم الكميات من المخزون.
// onSell({ patient, customerName, lines, items, paidNow }) يعيد الفاتورة الصادرة.
export default function SalesTab({ patients, supplies, invoices, canConfirmPayment, onSell, onPreview }) {
  const [customer, setCustomer] = useState(null);
  const [walkIn, setWalkIn] = useState('');
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState([]); // [{ id, name, unit, price, qty }]
  const [discount, setDiscount] = useState('');
  const [paidNow, setPaidNow] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const stockOf = (id) => supplies.find((s) => s.id === id)?.stock ?? 0;
  const sellable = useMemo(() => supplies.filter((s) => s.stock > 0), [supplies]);

  const customerName = customer?.name ?? walkIn.trim();
  const subtotal = round2(lines.reduce((t, l) => t + l.qty * l.price, 0));
  const requestedDiscount = Math.max(0, Number(discount) || 0);
  const discountValue = Math.min(requestedDiscount, subtotal);
  const total = round2(subtotal - discountValue);
  const willPay = paidNow && canConfirmPayment;

  const addSupply = (supply) => {
    setQuery('');
    setError('');
    setLines((prev) => {
      const existing = prev.find((l) => l.id === supply.id);
      if (existing) return prev.map((l) => (l.id === supply.id ? { ...l, qty: Math.min(l.qty + 1, supply.stock) } : l));
      return [...prev, { id: supply.id, name: supply.name, unit: supply.unit, price: Number(supply.price) || 0, qty: 1 }];
    });
  };

  const setQty = (id, value) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.floor(Number(value)) || 1) } : l)));

  const reset = () => {
    setCustomer(null);
    setWalkIn('');
    setQuery('');
    setLines([]);
    setDiscount('');
    setPaidNow(true);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName) return setError('اختر مريضاً مسجَّلاً أو اكتب اسم العميل.');
    if (lines.length === 0) return setError('أضف صنفاً واحداً على الأقل للبيع.');
    const over = lines.find((l) => l.qty > stockOf(l.id));
    if (over) return setError(`الكمية المطلوبة من «${over.name}» تتجاوز المتوفر في المخزون (${stockOf(over.id)}).`);

    const items = lines.map((l) => ({ description: l.name, qty: l.qty, price: l.price }));
    if (discountValue > 0) items.push({ id: 'discount-manual', description: 'خصم', qty: 1, price: -discountValue });

    onSell({ patient: customer, customerName, lines, items, paidNow: willPay });
    return reset();
  };

  const sales = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices
      .filter((i) => i.source === SALE_SOURCE)
      .filter((i) => !term || [i.patient_name, i.inv_no, i.service].some((v) => v && String(v).toLowerCase().includes(term)));
  }, [invoices, search]);

  return (
    <TabCard>
      <SectionHeader title="بيع المستلزمات الطبية" description="بيع مباشر من المخزون: تصدر فاتورة وتُخصم الكميات تلقائياً" icon={Store} />

      <form onSubmit={handleSubmit}>
        <PatientSearch patients={patients} patient={customer} onSelect={(p) => { setCustomer(p); setError(''); }} />
        {customer && (
          <button type="button" onClick={() => setCustomer(null)} style={{ ...smallOutlineButtonStyle, marginTop: '-10px', marginBottom: '14px' }}>
            <X size={13} color={COLORS.gold} /> إلغاء اختيار المريض ({getFileNumber(customer)})
          </button>
        )}
        {!customer && (
          <Field label="أو اسم العميل (بيع مباشر لغير المسجَّلين)" optional>
            <input type="text" className="warm-input" placeholder="اسم العميل" value={walkIn} onChange={(e) => setWalkIn(e.target.value)} onKeyDown={handleEnterAsTab} />
          </Field>
        )}

        <Field label="إضافة صنف للبيع (من المتوفر في المخزون)" large collapsible>
          <Autocomplete
            value={query}
            onChange={setQuery}
            items={sellable}
            getText={getSupplyText}
            renderItem={renderSupply}
            onSelect={addSupply}
            placeholder="ابحث عن المستلزم (مثال: بطاريات، قفازات...)"
            minChars={0}
          />
        </Field>

        {lines.length > 0 && (
          <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
            {lines.map((l) => (
              <div key={l.id} className="sale-line" style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 36px', gap: '10px', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}` }}>
                <div>
                  <strong style={{ color: COLORS.ink, fontSize: '14px' }}>{l.name}</strong>
                  <span style={{ display: 'block', fontSize: '11px', color: l.qty > stockOf(l.id) ? COLORS.danger : COLORS.muted }}>
                    المتوفر: {stockOf(l.id)} {l.unit} • السعر: {formatMoney(l.price)}
                  </span>
                </div>
                <input type="number" min="1" step="1" className="warm-input" style={{ margin: 0 }} value={l.qty} onChange={(e) => setQty(l.id, e.target.value)} aria-label={`كمية ${l.name}`} />
                <strong style={{ color: COLORS.ink, textAlign: 'left' }}>{formatMoney(round2(l.qty * l.price))}</strong>
                <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))} aria-label={`حذف ${l.name}`} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: COLORS.danger }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Field label="الخصم (د.أ)" optional collapsible>
            <input type="number" min="0" step="0.01" className="warm-input" placeholder="0.00" value={discount} onChange={(e) => setDiscount(e.target.value)} onKeyDown={handleEnterAsTab} style={{ maxWidth: '200px' }} />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: COLORS.text, marginTop: '26px', cursor: canConfirmPayment ? 'pointer' : 'default' }}>
            <input type="checkbox" checked={willPay} disabled={!canConfirmPayment} onChange={(e) => setPaidNow(e.target.checked)} />
            {canConfirmPayment ? 'تم استلام المبلغ كاملاً الآن' : 'تصدر الفاتورة بانتظار تأكيد الدفع (لا تملك صلاحية تأكيد الدفع)'}
          </label>
        </div>

        {lines.length > 0 && (
          <div style={{ background: COLORS.soft, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px 16px', margin: '6px 0 14px', fontSize: '13px', color: COLORS.ink }}>
            المجموع: {formatMoney(subtotal)}
            {discountValue > 0 && <> • الخصم: {formatMoney(discountValue)}{requestedDiscount > subtotal ? ' (خُفّض إلى إجمالي الفاتورة)' : ''}</>}
            {' '}• <strong style={{ fontSize: '15px' }}>الإجمالي: {formatMoney(total)}</strong>
          </div>
        )}

        {error && (
          <div role="alert" style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '10px', background: COLORS.dangerBg, color: COLORS.dangerText, fontSize: '13px', fontWeight: '700' }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: 'left' }}>
          <button type="submit" className="btn-warm-primary" disabled={lines.length === 0}>
            <Plus size={16} /> إتمام البيع وإصدار الفاتورة
          </button>
        </div>
      </form>

      <Panel
        title={`قائمة مبيعات المستلزمات (${sales.length})`}
        style={{ marginTop: '32px' }}
        actions={
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
            <Search size={14} color={COLORS.muted} style={{ position: 'absolute', right: '12px', top: '14px' }} />
            <input type="text" className="warm-input" placeholder="بحث بالعميل أو رقم الفاتورة أو الصنف" value={search} onChange={(e) => setSearch(e.target.value)} style={{ margin: 0, paddingRight: '34px' }} />
          </div>
        }
      >

        {sales.length === 0 ? (
          <p style={{ textAlign: 'center', color: COLORS.faint, padding: '20px' }}>لا توجد مبيعات مسجلة.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sales.slice(0, HISTORY_LIMIT).map((inv) => (
              <ListRow
                key={inv.id}
                leading={<span style={{ fontWeight: '800', color: COLORS.gold, fontSize: '14px', background: COLORS.soft, padding: '8px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}` }}>{inv.inv_no}</span>}
                title={inv.patient_name}
                subtitle={`${inv.service} • 📅 ${formatDateDMY(inv.date)}`}
              >
                <strong style={{ fontSize: '15px', color: COLORS.ink }}>{formatMoney(inv.total)}</strong>
                <StatusBadge tone={inv.status === INVOICE_STATUS.PAID ? 'success' : 'warning'}>{inv.status}</StatusBadge>
                <button type="button" onClick={() => onPreview(inv)} style={smallOutlineButtonStyle}>
                  <Eye size={14} color={COLORS.gold} /> معاينة
                </button>
              </ListRow>
            ))}
            {sales.length > HISTORY_LIMIT && (
              <p style={{ textAlign: 'center', color: COLORS.muted, fontSize: '12px' }}>
                يُعرض آخر {HISTORY_LIMIT} عملية بيع؛ استخدم البحث لإيجاد غيرها، أو افتح قسم الفواتير.
              </p>
            )}
          </div>
        )}
      </Panel>
    </TabCard>
  );
}
