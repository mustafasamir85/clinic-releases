import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { COLORS } from '../../styles';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import StatusBadge from '../../components/common/StatusBadge';

// جرد المخزون: أدخل الكمية الفعلية بعد العدّ، فتُسوّى الفروقات وتُسجَّل في سجل الحركة
export default function StockCountModal({ items, onApply, onClose }) {
  const [counts, setCounts] = useState(() => Object.fromEntries(items.map((s) => [s.id, String(s.stock)])));
  const [reason, setReason] = useState('');

  const diffOf = (s) => {
    const raw = counts[s.id];
    if (raw === '' || raw === undefined) return 0;
    return Number(raw) - s.stock;
  };

  const changed = items.filter((s) => diffOf(s) !== 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply(
      changed.map((s) => ({ id: s.id, counted: Number(counts[s.id]) })),
      reason.trim()
    );
  };

  return (
    <Modal title="جرد المخزون وتعديل الكميات" icon={ClipboardCheck} maxWidth={680} onClose={onClose}>
      <p style={{ margin: '0 0 14px 0', color: COLORS.muted, fontSize: '13px' }}>
        أدخل الكمية الفعلية الموجودة لكل صنف. الأصناف التي تختلف عن رصيد النظام فقط هي التي ستُعدَّل.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {items.map((s) => {
            const diff = diffOf(s);
            return (
              <div key={s.id} className="stock-row" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', gap: '10px', alignItems: 'center', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px 14px' }}>
                <strong style={{ fontSize: '13px', color: COLORS.ink }}>{s.name}</strong>
                <span style={{ fontSize: '12px', color: COLORS.muted }}>الرصيد: {s.stock} {s.unit}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={counts[s.id]}
                  onChange={(e) => setCounts((c) => ({ ...c, [s.id]: e.target.value }))}
                  className="warm-input"
                  style={{ margin: 0, padding: '8px 12px' }}
                  aria-label={`الكمية الفعلية: ${s.name}`}
                />
                <div style={{ textAlign: 'center' }}>
                  {diff !== 0 && (
                    <StatusBadge small tone={diff > 0 ? 'success' : 'danger'}>
                      {diff > 0 ? `+${diff}` : diff}
                    </StatusBadge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Field label="سبب التعديل / ملاحظات الجرد" optional>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="warm-input" placeholder="مثال: جرد نهاية الشهر، تالف، فقدان..." />
        </Field>

        <FormActions onCancel={onClose} submitLabel={`اعتماد الجرد (${changed.length} تعديل)`} disabled={changed.length === 0} />
      </form>
    </Modal>
  );
}
