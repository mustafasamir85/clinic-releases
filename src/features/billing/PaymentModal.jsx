import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { COLORS } from '../../styles';
import { formatMoney } from '../../utils/format';
import { patientDue } from '../../hooks/useInvoices';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';

const round2 = (n) => Math.round(n * 100) / 100;

// تسجيل دفعة (كاملة أو جزئية) على فاتورة. المبلغ الافتراضي هو المتبقي.
export default function PaymentModal({ invoice, onSubmit, onClose }) {
  const due = patientDue(invoice);
  const remaining = round2(due - invoice.paid);
  const [amount, setAmount] = useState(String(remaining));
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0) || value > remaining) {
      setError(`أدخل مبلغاً أكبر من 0 ولا يتجاوز المتبقي (${formatMoney(remaining)}).`);
      return;
    }
    onSubmit(invoice.id, value);
  };

  return (
    <Modal title="تسجيل دفعة" subtitle={`${invoice.inv_no} — ${invoice.patient_name}`} icon={Wallet} maxWidth={440} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ background: COLORS.soft, borderRadius: '10px', padding: '12px 16px', fontSize: '13px', fontWeight: '700', display: 'grid', gap: '4px', marginBottom: '14px' }}>
          <span>المستحق على المريض: {formatMoney(due)}</span>
          <span>المدفوع سابقاً: {formatMoney(invoice.paid)}</span>
          <span>المتبقي: <span style={{ color: COLORS.gold }}>{formatMoney(remaining)}</span></span>
        </div>

        <Field label="المبلغ المدفوع الآن (د.أ)" required>
          <input type="number" min="0.01" max={remaining} step="0.01" className="warm-input" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
        </Field>

        {error && <p style={{ color: COLORS.danger, fontSize: '13px', fontWeight: '700', margin: '10px 0 0 0' }} role="alert">{error}</p>}

        <FormActions onCancel={onClose} submitLabel="تسجيل الدفعة" />
      </form>
    </Modal>
  );
}
