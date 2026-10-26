import { usePatientInsurance } from '../../hooks/usePatientInsurance';
import InsuranceSelector, { insuranceDetails } from '../../components/common/InsuranceSelector';
import { useState } from 'react';
import AppointmentQueue from '../schedule/AppointmentQueue';
import PatientSearch from '../../components/common/PatientSearch';
import { FileUp, Send, Stethoscope } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { SectionHeader, TabCard } from '../../components/common/layout';
import Field from '../../components/common/Field';
import ChargesPicker, { EMPTY_CHARGES, chargesItems, chargesTotal, hasCharges, proceduresText, suppliesText, toInvoiceItem } from '../../components/common/ChargesPicker';
import PrescriptionBuilder, { formatPrescription } from './PrescriptionBuilder';
import MedicationImportModal from './MedicationImportModal';
import { COLORS, outlineGoldButtonStyle } from '../../styles';
import { formatMoney } from '../../utils/format';
import { handleEnterAsTab } from '../../utils/form';
import { withOffer } from '../offers/offerUtils';
import DiagnosisInput from '../../components/common/DiagnosisInput';

export default function EntTab({ patient, patients, offers = [], services, supplies, medications = [], onSaveMedicationUsage, insuranceCompanies, onSelectPatient, onAddVisit, appointments, onPickAppointment, onImportMedications }) {
  const [summary, setSummary] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [insurance, setInsurance, resetInsurance] = usePatientInsurance(patient);
  const [meds, setMeds] = useState([]);
  const [charges, setCharges] = useState(EMPTY_CHARGES);
  const [discount, setDiscount] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const entServices = services.filter((s) => s.dept === DEPARTMENTS.ENT);
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
      DEPARTMENTS.ENT,
      {
        summary,
        ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
        prescription: formatPrescription(meds),
        ...insuranceDetails(insurance, insuranceCompanies),
        procedures: proceduresText(charges),
        supplies_used: suppliesText(charges),
        ...(discountValue > 0 ? { discount: discountValue } : {}),
      },
      invoiceItem,
      charges.supplies
    );
    setSummary('');
    setDiagnosis('');
    setMeds([]);
    setCharges(EMPTY_CHARGES);
    setDiscount('');
    resetInsurance();
  };

  return (
    <TabCard>
      <SectionHeader title="عيادة الأنف والأذن والحنجرة (ENT)" icon={Stethoscope} />
      <AppointmentQueue appointments={appointments} department={DEPARTMENTS.ENT} currentPatient={patient} onPick={onPickAppointment} />
      <PatientSearch patients={patients} patient={patient} onSelect={onSelectPatient} />

      <form onSubmit={handleSubmit}>
        <Field label="التشخيص" optional large collapsible>
          <DiagnosisInput value={diagnosis} onChange={setDiagnosis} />
        </Field>

        <Field label="الفحص السريري والتشخيص للزيارة الجديدة" large collapsible>
          <textarea
            className="warm-textarea"
            rows="3"
            placeholder="نتائج الفحص والمنظار وتأثير الحالة..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
          />
        </Field>

        <PrescriptionBuilder
          meds={meds}
          onChange={setMeds}
          medications={medications}
          onSaveUsage={onSaveMedicationUsage}
        />
        {onImportMedications && (
          <div style={{ marginTop: '-8px', marginBottom: '16px' }}>
            <button type="button" onClick={() => setImportOpen(true)} style={{ ...outlineGoldButtonStyle, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <FileUp size={14} /> استيراد قاعدة الأدوية من ملف ({medications.length} دواء حالياً)
            </button>
          </div>
        )}

        <InsuranceSelector companies={insuranceCompanies} value={insurance} onChange={setInsurance} />

        <ChargesPicker procedures={entServices} supplies={supplies} value={charges} onChange={setCharges} offers={offers} services={services} />

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
            <Send size={16} /> حفظ وإضافة الزيارة للسجل {hasCharges(charges) ? 'وإصدار الفاتورة' : ''}
          </button>
        </div>
      </form>
      {importOpen && <MedicationImportModal onImport={onImportMedications} onClose={() => setImportOpen(false)} />}
    </TabCard>
  );
}
