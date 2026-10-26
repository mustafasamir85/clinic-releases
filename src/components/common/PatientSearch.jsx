import { useState } from 'react';
import { Search } from 'lucide-react';
import { COLORS } from '../../styles';
import { calculateAge, getFileNumber } from '../../utils/format';
import { Panel } from './layout';
import Autocomplete from './Autocomplete';

// نص البحث: الاسم + الهاتف + رقم الملف (البحث في Autocomplete يطابق أي جزء منه)
const getPatientText = (p) => `${p.name} ${p.phone ?? ''} ${p.file_number ?? ''}`;

const renderPatient = (p) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span>👤 {p.name}</span>
    <span style={{ fontSize: '11px', color: COLORS.muted, fontWeight: '700' }}>
      {getFileNumber(p)} • {p.age ?? calculateAge(p.birth_date)} سنة
    </span>
  </div>
);

// بحث عن المريض واختياره من داخل شاشة القسم، مع إظهار المريض الحالي
export default function PatientSearch({ patients, patient, onSelect }) {
  const [query, setQuery] = useState('');

  return (
    <Panel title="البحث عن المريض (بالاسم أو الهاتف أو رقم الملف)" icon={Search} style={{ marginBottom: '20px' }}>

      <Autocomplete
        value={query}
        onChange={setQuery}
        items={patients}
        getText={getPatientText}
        renderItem={renderPatient}
        onSelect={(p) => {
          onSelect(p);
          setQuery('');
        }}
        placeholder="ابدأ بكتابة اسم المريض..."
      />

      <p style={{ color: COLORS.muted, fontSize: '13px', margin: '10px 0 0 0' }}>
        المريض الحالي:{' '}
        <span style={{ fontWeight: '700', color: COLORS.gold }}>
          {patient ? `${patient.name} (${getFileNumber(patient)})` : 'لم يتم اختيار مريض'}
        </span>
      </p>
    </Panel>
  );
}
