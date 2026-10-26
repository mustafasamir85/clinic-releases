import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { COLORS, twoColumns } from '../../styles';
import { formatMoney } from '../../utils/format';
import { usePatientInsurance } from '../../hooks/usePatientInsurance';
import { insuranceShare, itemsTotal } from '../../hooks/useInvoices';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import PatientSearch from '../../components/common/PatientSearch';
import InsuranceSelector, { insuranceDetails } from '../../components/common/InsuranceSelector';
import { isOfferRunning, offerValueText, withOffer } from '../offers/offerUtils';
import InvoiceItemsEditor, { cleanItems, newItem } from '../../components/common/InvoiceItemsEditor';
import { expandFree } from '../freeServices/freeUtils';

const round2 = (n) => Math.round(n * 100) / 100;

// فاتورة يدوية: اختيار المريض بالبحث + بنود قابلة للتعديل + التأمين + المبلغ المدفوع
export default function NewInvoiceModal({ patients, insuranceCompanies, offers, services, onSubmit, onClose }) {
  const [patient, setPatient] = useState(null);
  const [items, setItems] = useState([newItem()]);
  const [paid, setPaid] = useState('');
  const [insurance, setInsurance] = usePatientInsurance(patient);
  const [error, setError] = useState('');
  const [offerId, setOfferId] = useState('');

  const runningOffers = offers.filter(isOfferRunning);
  const offer = runningOffers.find((o) => String(o.id) === offerId) ?? null;

  const clean = expandFree(cleanItems(items)); // الصف المعلَّم "مجاني" يصبح بنداً + بند خصم مقابل
  // خصم العرض المختار يُحسب مباشرة من البنود، ويُضاف كبند سالب عند الحفظ
  const { items: withDiscount, discount: discountAmount, error: discountError } = withOffer(clean, offerId, runningOffers, services);
  const discount = { amount: discountAmount, error: discountError };
  const total = itemsTotal(withDiscount);
  const details = insuranceDetails(insurance, insuranceCompanies);
  const share = details.insurance_company ? insuranceShare(total, { name: details.insurance_company, copay: details.insurance_copay }).amount : 0;
  const due = round2(total - share);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patient) return setError('اختر المريض من نتائج البحث أولاً.');
    if (offer && discount.error) return setError(discount.error);
    if (clean.length === 0) return setError('أضف بنداً واحداً على الأقل بوصف وكمية وسعر صحيحين.');
    const paidNum = Number(paid || 0);
    if (paidNum < 0 || paidNum > due) return setError(`المبلغ المدفوع يجب أن يكون بين 0 و${formatMoney(due)} (المستحق على المريض).`);

    onSubmit({
      patientName: patient.name,
      patientId: patient.id,
      items: withDiscount,
      paid: paidNum,
      insurance: details.insurance_company ? { name: details.insurance_company, copay: details.insurance_copay } : null,
    });
  };

  return (
    <Modal title="إصدار فاتورة جديدة" icon={DollarSign} maxWidth={720} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <PatientSearch patients={patients} patient={patient} onSelect={setPatient} />

        <InvoiceItemsEditor items={items} onChange={setItems} suggestions={services.map((s) => s.name)} />

        {runningOffers.length > 0 && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
            <Field label="تطبيق عرض (اختياري)">
              <select className="warm-select" style={{ margin: 0 }} value={offerId} onChange={(e) => setOfferId(e.target.value)}>
                <option value="">بدون عرض</option>
                {runningOffers.map((o) => (
                  <option key={o.id} value={o.id}>{o.name} — خصم {offerValueText(o)}</option>
                ))}
              </select>
            </Field>
            {offer && (
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', fontWeight: '700', color: discount.error ? COLORS.danger : COLORS.successText }}>
                {discount.error || `قيمة الخصم: ${formatMoney(discount.amount)}`}
              </p>
            )}
          </div>
        )}

        <InsuranceSelector companies={insuranceCompanies} value={insurance} onChange={setInsurance} />

        <div style={{ ...twoColumns, alignItems: 'end' }}>
          <Field label="المبلغ المدفوع الآن (د.أ)">
            <input type="number" min="0" max={due || undefined} step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} className="warm-input" placeholder="0 = بانتظار الدفع" />
          </Field>
          <button type="button" onClick={() => setPaid(String(due))} className="btn-warm-primary" style={{ height: '42px', justifyContent: 'center' }}>
            دفع كامل المستحق
          </button>
        </div>

        <div style={{ marginTop: '14px', background: COLORS.soft, borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span>الإجمالي: {formatMoney(total)}</span>
          {share > 0 && <span style={{ color: COLORS.successText }}>على التأمين: {formatMoney(share)}</span>}
          <span>المستحق على المريض: <span style={{ color: COLORS.gold }}>{formatMoney(due)}</span></span>
        </div>

        {error && <p style={{ color: COLORS.danger, fontSize: '13px', fontWeight: '700', margin: '12px 0 0 0' }} role="alert">{error}</p>}

        <FormActions onCancel={onClose} submitLabel="إصدار وحفظ الفاتورة" />
      </form>
    </Modal>
  );
}
