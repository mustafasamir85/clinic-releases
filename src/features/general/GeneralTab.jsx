import InsuranceSelector, { NO_INSURANCE, insuranceDetails } from '../../components/common/InsuranceSelector';
import { useState } from 'react';
import { Send, Stethoscope } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { COLORS } from '../../styles';
import { Panel, CurrentPatient, SectionHeader, TabCard } from '../../components/common/layout';
import Field from '../../components/common/Field';
import ChargesPicker, { EMPTY_CHARGES, hasCharges, proceduresText, suppliesText, toInvoiceItem } from '../../components/common/ChargesPicker';
import PrescriptionBuilder, { formatPrescription } from '../ent/PrescriptionBuilder';

const EMPTY_VITALS = { bp: '', pulse: '', temp: '', spo2: '', weight: '', sugar: '' };

const VITAL_FIELDS = [
  { key: 'bp', label: 'ضغط الدم (mmHg)', placeholder: '120/80', type: 'text', unit: 'mmHg' },
  { key: 'pulse', label: 'النبض (نبضة/د)', placeholder: '75', type: 'number', unit: 'نبضة/د' },
  { key: 'temp', label: 'الحرارة (°C)', placeholder: '37', type: 'number', step: '0.1', unit: '°C' },
  { key: 'spo2', label: 'تشبع الأكسجين (%)', placeholder: '98', type: 'number', unit: '%' },
  { key: 'weight', label: 'الوزن (كغم)', placeholder: '70', type: 'number', step: '0.1', unit: 'كغم' },
  { key: 'sugar', label: 'سكر الدم (mg/dL)', placeholder: '100', type: 'number', unit: 'mg/dL' },
];

const LABELS = { bp: 'الضغط', pulse: 'النبض', temp: 'الحرارة', spo2: 'الأكسجين', weight: 'الوزن', sugar: 'السكر' };

const formatVitals = (vitals) =>
  VITAL_FIELDS.filter((f) => vitals[f.key] !== '')
    .map((f) => `${LABELS[f.key]}: ${vitals[f.key]} ${f.unit}`)
    .join(' • ');

export default function GeneralTab({ patient, services, supplies, insuranceCompanies, onAddVisit }) {
  const [complaint, setComplaint] = useState('');
  const [vitals, setVitals] = useState(EMPTY_VITALS);
  const [summary, setSummary] = useState('');
  const [insurance, setInsurance] = useState(NO_INSURANCE);
  const [meds, setMeds] = useState([]);
  const [advice, setAdvice] = useState('');
  const [charges, setCharges] = useState(EMPTY_CHARGES);

  const generalServices = services.filter((s) => s.dept === DEPARTMENTS.GENERAL);
  const setVital = (key) => (e) => setVitals((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    onAddVisit(
      DEPARTMENTS.GENERAL,
      {
        complaint,
        vitals: formatVitals(vitals),
        summary,
        prescription: formatPrescription(meds),
        advice,
        ...insuranceDetails(insurance, insuranceCompanies),
        procedures: proceduresText(charges),
        supplies_used: suppliesText(charges),
      },
      toInvoiceItem(charges),
      charges.supplies
    );

    setComplaint('');
    setVitals(EMPTY_VITALS);
    setSummary('');
    setMeds([]);
    setAdvice('');
    setCharges(EMPTY_CHARGES);
    setInsurance(NO_INSURANCE);
  };

  return (
    <TabCard>
      <SectionHeader title="عيادة الطب العام" description="الكشف العام، العلامات الحيوية، التشخيص، والوصفة الطبية" icon={Stethoscope} />
      <CurrentPatient patient={patient} />

      <form onSubmit={handleSubmit}>
        <Field label="الشكوى الرئيسية" large required collapsible>
          <textarea
            className="warm-textarea"
            rows="2"
            placeholder="سبب الزيارة والأعراض ومدتها..."
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            required
          />
        </Field>

        <Panel title="العلامات الحيوية" style={{ margin: '8px 0 16px 0' }}>
          <div className="grid-2m" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {VITAL_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <input
                  type={f.type}
                  step={f.step}
                  min={f.type === 'number' ? '0' : undefined}
                  className="warm-input"
                  placeholder={f.placeholder}
                  value={vitals[f.key]}
                  onChange={setVital(f.key)}
                />
              </Field>
            ))}
          </div>
        </Panel>

        <Field label="الفحص السريري والتشخيص" large required collapsible>
          <textarea
            className="warm-textarea"
            rows="3"
            placeholder="نتائج الفحص السريري والتشخيص المبدئي..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
          />
        </Field>

        <PrescriptionBuilder meds={meds} onChange={setMeds} />

        <Field label="التوصيات وموعد المراجعة" large collapsible>
          <textarea
            className="warm-textarea"
            rows="2"
            placeholder="نصائح للمريض، فحوصات مطلوبة، موعد المراجعة..."
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
          />
        </Field>

        <InsuranceSelector companies={insuranceCompanies} value={insurance} onChange={setInsurance} />

        <ChargesPicker procedures={generalServices} supplies={supplies} value={charges} onChange={setCharges} />

        <div style={{ textAlign: 'left', marginTop: '16px' }}>
          <button type="submit" className="btn-warm-primary" disabled={!patient}>
            <Send size={16} /> حفظ الزيارة {hasCharges(charges) ? 'وإصدار الفاتورة' : ''}
          </button>
        </div>
      </form>
    </TabCard>
  );
}
