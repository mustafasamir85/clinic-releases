import { useMemo, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { COLORS } from '../../styles';
import { formatMoney } from '../../utils/format';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import { returnableLines, buildSaleReturn, refundFor } from './saleReturn';

// مرتجع بيع مستلزمات: يختار المستخدم كمية كل صنف يُرجَع (حتى المتبقي من البيع) وسبب الإرجاع.
// onSubmit({ selections, reason }) يعيد نص خطأ أو undefined عند النجاح.
export default function SaleReturnModal({ invoice, supplies, onSubmit, onClose }) {
  const lines = useMemo(() => returnableLines(invoice, supplies), [invoice, supplies]);
  const [qtys, setQtys] = useState({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const selections = lines.map((l) => ({ name: l.name, qty: qtys[l.name] ?? 0 }));
  // معاينة القيمة والمبلغ المسترد بنفس منطق التنفيذ الفعلي
  const preview = buildSaleReturn({ invoice, supplies, selections, reason, id: 'preview', date: '' });
  const value = preview.error ? 0 : preview.value;
  const { newTotal, refund } = refundFor(invoice, value);

  const setQty = (line, raw) => {
    const qty = Math.min(line.max, Math.max(0, Math.floor(Number(raw)) || 0));
    setQtys((prev) => ({ ...prev, [line.name]: qty }));
    setError('');
  };

  const returnAll = () => setQtys(Object.fromEntries(lines.map((l) => [l.name, l.max])));

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = onSubmit({ selections, reason });
    if (err) setError(err);
  };

  return (
    <Modal title={`مرتجع مبيعات — ${invoice.inv_no}`} icon={Undo2} subtitle={`العميل: ${invoice.patient_name}`} maxWidth={620} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
          {lines.map((l) => (
            <div key={l.name} style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '10px', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}`, opacity: l.max === 0 ? 0.55 : 1 }}>
              <div>
                <strong style={{ color: COLORS.ink, fontSize: '14px' }}>{l.name}</strong>
                <span style={{ display: 'block', fontSize: '11px', color: COLORS.muted }}>
                  المباع: {l.sold} • سبق إرجاعه: {l.returned} • المتاح للإرجاع: {l.max} • سعر الوحدة المدفوع: {formatMoney(Math.round(l.netPrice * 100) / 100)}
                </span>
                {l.supplyId == null && l.max > 0 && (
                  <span style={{ display: 'block', fontSize: '11px', color: COLORS.danger }}>الصنف غير موجود في المخزون حالياً: يُسترد المبلغ دون إضافة كمية للمخزون.</span>
                )}
              </div>
              <input
                type="number"
                min="0"
                max={l.max}
                step="1"
                className="warm-input"
                style={{ margin: 0 }}
                value={qtys[l.name] ?? 0}
                disabled={l.max === 0}
                onChange={(e) => setQty(l, e.target.value)}
                aria-label={`كمية مرتجع ${l.name}`}
              />
            </div>
          ))}
        </div>

        <button type="button" onClick={returnAll} style={{ background: 'transparent', border: 'none', color: COLORS.gold, cursor: 'pointer', fontWeight: '700', marginBottom: '12px', padding: 0 }}>
          إرجاع كل المتبقي
        </button>

        <Field label="سبب الإرجاع" optional>
          <input type="text" className="warm-input" placeholder="مثال: صنف تالف / تغيّر الحاجة" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        </Field>

        {value > 0 && (
          <div style={{ background: COLORS.soft, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px 16px', margin: '6px 0', fontSize: '13px', color: COLORS.ink, lineHeight: 1.9 }}>
            قيمة المرتجع: <strong>{formatMoney(value)}</strong> • إجمالي الفاتورة بعد المرتجع: <strong>{formatMoney(newTotal)}</strong>
            <br />
            {refund > 0 ? (
              <strong style={{ color: COLORS.danger }}>المبلغ المطلوب رده للعميل نقداً: {formatMoney(refund)}</strong>
            ) : (
              <span>لا يوجد مبلغ مدفوع زائد يُرَدّ للعميل (يُخفَّض المستحق على الفاتورة فقط).</span>
            )}
          </div>
        )}

        {error && (
          <div role="alert" style={{ margin: '10px 0', padding: '10px 14px', borderRadius: '10px', background: COLORS.dangerBg, color: COLORS.dangerText, fontSize: '13px', fontWeight: '700' }}>
            {error}
          </div>
        )}

        <FormActions onCancel={onClose} submitLabel="تأكيد المرتجع" submitIcon={Undo2} disabled={value <= 0} />
      </form>
    </Modal>
  );
}
