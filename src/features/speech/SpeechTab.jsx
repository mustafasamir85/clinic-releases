import { useState } from 'react';
import { Mic, Send } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { usePatientInsurance } from '../../hooks/usePatientInsurance';
import { SectionHeader, TabCard } from '../../components/common/layout';
import Field from '../../components/common/Field';
import DiagnosisInput from '../../components/common/DiagnosisInput';
import AppointmentQueue from '../schedule/AppointmentQueue';
import PatientSearch from '../../components/common/PatientSearch';
import InsuranceSelector, { insuranceDetails } from '../../components/common/InsuranceSelector';
import ChargesPicker, {
  EMPTY_CHARGES,
  chargesItems,
  chargesTotal,
  hasCharges,
  proceduresText,
  suppliesText,
  toInvoiceItem,
} from '../../components/common/ChargesPicker';
import { COLORS } from '../../styles';
import { formatMoney } from '../../utils/format';
import { handleEnterAsTab } from '../../utils/form';
import { withOffer } from '../offers/offerUtils';

export default function SpeechTab({ patient, patients, offers = [], services, supplies, insuranceCompanies, onSelectPatient, onAddVisit, appointments, onPickAppointment }) {
  const [assessment, setAssessment] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [plan, setPlan] = useState('');
  const [charges, setCharges] = useState(EMPTY_CHARGES);
  const [insurance, setInsurance, resetInsurance] = usePatientInsurance(patient);
  const [discount, setDiscount] = useState('');

  const speechServices = services.filter((s) => s.dept === DEPARTMENTS.SPEECH);
  const subtotal = Math.max(0, Math.round((chargesTotal(charges) - withOffer(chargesItems(charges), charges.offerId, offers, services).discount) * 100) / 100);
  const requestedDiscount = Math.max(0, Number(discount) || 0);
  const discountValue = Math.min(requestedDiscount, subtotal);

  const handleSubmit = (e) => {
    e.preventDefault();
    const invoiceItem = toInvoiceItem(charges);
    if (invoiceItem && discountValue > 0) {
      invoiceItem.items = [...invoiceItem.items, { id: 'discount-manual', description: 'خصم', qty: 1, price: -discountValue }];
      invoiceItem.total = Math.round((subtotal - discountValue) * 100) / 100;
    }
    onAddVisit(
      DEPARTMENTS.SPEECH,
      {
        summary: assessment,
        ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
        progress: plan,
        ...insuranceDetails(insurance, insuranceCompanies),
        procedures: proceduresText(charges),
        supplies_used: suppliesText(charges),
        ...(discountValue > 0 ? { discount: discountValue } : {}),
      },
      invoiceItem,
      charges.supplies
    );
    setAssessment('');
    setDiagnosis('');
    setPlan('');
    setCharges(EMPTY_CHARGES);
    setDiscount('');
    resetInsurance();
  };

  return (
    <TabCard>
      <SectionHeader title="جلسات علاج النطق والتخاطب" icon={Mic} />
      <AppointmentQueue appointments={appointments} department={DEPARTMENTS.SPEECH} currentPatient={patient} onPick={onPickAppointment} />
      <PatientSearch patients={patients} patient={patient} onSelect={onSelectPatient} />

      <form onSubmit={handleSubmit}>
        <Field label="التشخيص" optional large collapsible>
          <DiagnosisInput value={diagnosis} onChange={setDiagnosis} />
        </Field>

        <Field label="تقييم النطق واللغة" large collapsible>
          <textarea
            className="warm-textarea"
            rows="3"
            placeholder="مخارج الحروف ومستوى التأتأة أو التأخر اللغوي..."
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            required
          />
        </Field>

        <Field label="خطة الجلسة وملاحظات التقدم" large collapsible>
          <textarea
            className="warm-textarea"
            rows="3"
            placeholder="التمارين المتبعة ومؤشرات تحسن المريض..."
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            required
          />
        </Field>

        <InsuranceSelector companies={insuranceCompanies} value={insurance} onChange={setInsurance} />

        <ChargesPicker procedures={speechServices} supplies={supplies} value={charges} onChange={setCharges} offers={offers} services={services} />

        <div style={{ marginTop: '16px' }}>
          <Field label="الخصم (د.أ)" optional large collapsible>
            <input
              type="number"
              min="0"
              step="0.01"
              className="warm-input"
              placeholder="0.00"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              onKeyDown={handleEnterAsTab}
              style={{ maxWidth: '220px' }}
            />
          </Field>
          {requestedDiscount > 0 && !hasCharges(charges) && (
            <span style={{ fontSize: '12px', color: COLORS.danger, fontWeight: '700', display: 'block', marginTop: '-6px' }}>
              لا توجد إجراءات أو مستلزمات في الفاتورة ليُطبَّق عليها الخصم.
            </span>
          )}
          {requestedDiscount > 0 && hasCharges(charges) && (
            <span style={{ fontSize: '12px', color: COLORS.gold, fontWeight: '800', display: 'block', marginTop: '-6px' }}>
              {requestedDiscount > subtotal ? `سيُخفَّض الخصم إلى ${formatMoney(subtotal)} (إجمالي الفاتورة). ` : ''}
              إجمالي الفاتورة بعد الخصم: {formatMoney(subtotal - discountValue)}
            </span>
          )}
        </div>

        <div style={{ textAlign: 'left', marginTop: '16px' }}>
          <button type="submit" className="btn-warm-primary" disabled={!patient}>
            <Send size={16} /> تسجيل الجلسة الجديدة {hasCharges(charges) ? 'وإصدار الفاتورة' : ''}
          </button>
        </div>
      </form>
    </TabCard>
  );
}
