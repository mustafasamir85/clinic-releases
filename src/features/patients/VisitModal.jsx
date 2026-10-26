import { useState } from 'react';
import { Send } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import PrescriptionBuilder, { formatPrescription } from '../ent/PrescriptionBuilder';
import { usePatientInsurance } from '../../hooks/usePatientInsurance';
import InsuranceSelector, { insuranceDetails } from '../../components/common/InsuranceSelector';
import { COLORS } from '../../styles';
import { getFileNumber } from '../../utils/format';
import DiagnosisInput from '../../components/common/DiagnosisInput';

export default function VisitModal({ patient, insuranceCompanies, onSubmit, onClose }) {
  const [department, setDepartment] = useState(DEPARTMENTS.ENT);
  const [summary, setSummary] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [meds, setMeds] = useState([]);
  const [insurance, setInsurance] = usePatientInsurance(patient);

  const handleSubmit = (e) => {
    e.preventDefault();
    const prescription = department === DEPARTMENTS.ENT ? formatPrescription(meds) : '';
    onSubmit(department, { summary, ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}), prescription, ...insuranceDetails(insurance, insuranceCompanies) });
  };

  return (
    <Modal
      title="إضافة زيارة جديدة"
      subtitle={<>المريض: <strong style={{ color: COLORS.gold }}>{patient.name}</strong> ({getFileNumber(patient)})</>}
      maxWidth={580}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <Field label="القسم الطبي" required>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="warm-select" required>
            <option value={DEPARTMENTS.ENT}>الأنف والأذن والحنجرة (ENT)</option>
            <option value={DEPARTMENTS.AUDIO}>فحص السمعيات والسماعات</option>
            <option value={DEPARTMENTS.SPEECH}>جلسات علاج التخاطب</option>
          </select>
        </Field>

        <Field label="التشخيص" optional style={{ marginTop: '12px' }}>
          <DiagnosisInput value={diagnosis} onChange={setDiagnosis} />
        </Field>

        <Field label="الفحص والتشخيص / ملخص الزيارة" required style={{ marginTop: '12px' }}>
          <textarea className="warm-textarea" rows="3" placeholder="أدخل تشخيص الحالة والملاحظات الطبية..." value={summary} onChange={(e) => setSummary(e.target.value)} required />
        </Field>

        {department === DEPARTMENTS.ENT && <PrescriptionBuilder meds={meds} onChange={setMeds} />}

        <div style={{ marginTop: '16px' }}>
          <InsuranceSelector companies={insuranceCompanies} value={insurance} onChange={setInsurance} />
        </div>

        <FormActions onCancel={onClose} submitLabel="حفظ الزيارة" submitIcon={Send} />
      </form>
    </Modal>
  );
}
