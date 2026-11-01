import { useEffect, useState } from 'react';
import { TabSkeleton } from '../../components/common/Skeleton';
import { Plus, Search } from 'lucide-react';
import Autocomplete from '../../components/common/Autocomplete';
import { COLORS } from '../../styles';
import { calculateAge, getFileNumber } from '../../utils/format';
import PatientProfile from './PatientProfile';
import { CollapsibleSection } from '../../components/common/layout';

// نص البحث: الاسم + الهاتف + رقم الملف
const getPatientText = (p) => `${p.name} ${p.phone ?? ''} ${p.file_number ?? ''}`;

const renderPatient = (p) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span>👤 {p.name}</span>
    <span style={{ fontSize: '11px', color: COLORS.muted, fontWeight: '700' }}>
      {getFileNumber(p)} • {p.age ?? calculateAge(p.birth_date)} سنة
    </span>
  </div>
);

export default function PatientsTab({
  loading,
  patients,
  selectedPatient,
  searchPick = 0,
  selectedVisit,
  onSelectPatient,
  onSelectVisit,
  onNewPatient,
  onEditPatient,
  onEditVisit,
  onDeleteVisit,
  documents,
  onUpdateHistory,
  insuranceCompanies,
  onUpdateInsurance,
}) {
  const [query, setQuery] = useState('');
  const [openedId, setOpenedId] = useState(null); // المريض الذي اختير من البحث في هذه الشاشة

  // اختيار مريض من البحث الشامل (Ctrl+K): نفتح ملفه ونعرض اسمه في خانة البحث.
  // يعمل أيضاً عند الوصول من شاشة أخرى (تُركَّب الشاشة والعدّاد > 0 والمريض محدد).
  useEffect(() => {
    if (searchPick > 0 && selectedPatient) {
      setOpenedId(selectedPatient.id);
      setQuery(selectedPatient.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPick]);

  const handleSelect = (patient) => {
    onSelectPatient(patient);
    setOpenedId(patient.id);
    setQuery(patient.name);
  };

  // تعديل نص البحث يُخفي الملف المفتوح حتى يُختار مريض من القائمة من جديد
  const handleQuery = (value) => {
    setQuery(value);
    setOpenedId(null);
  };

  if (loading) return <TabSkeleton label="جاري تحميل سجلات المرضى..." />;

  return (
    <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
      <div className="warm-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>الملف الطبي الإلكتروني (EMR)</h2>
          <p style={{ margin: '4px 0 0 0', color: COLORS.muted, fontSize: '13px' }}>إدارة سجلات المرضى والبيانات الشخصية الكاملة</p>
        </div>
        <button onClick={onNewPatient} className="btn-warm-primary">
          <Plus size={18} /> إضافة مريض جديد
        </button>
      </div>

      <div className="warm-card">
        <CollapsibleSection header={
        <label style={{ fontSize: '13px', fontWeight: '700', color: COLORS.text, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Search size={14} color={COLORS.gold} /> البحث عن مريض (بالاسم أو الهاتف أو رقم الملف)
        </label>
        }>
        <Autocomplete
          value={query}
          onChange={handleQuery}
          items={patients}
          getText={getPatientText}
          renderItem={renderPatient}
          onSelect={handleSelect}
          placeholder="ابدأ بكتابة اسم المريض أو رقم هاتفه أو رقم ملفه..."
        />
        {!openedId && (
          <p style={{ margin: '12px 0 0 0', color: COLORS.faint, fontSize: '13px' }}>
            اختر المريض من القائمة المنسدلة لعرض ملفه.
          </p>
        )}
        </CollapsibleSection>
      </div>

      {/* الملف لا يظهر إلا للمريض الذي اختير من قائمة البحث */}
      {selectedPatient && selectedPatient.id === openedId && (
        <PatientProfile
          patient={selectedPatient}
          selectedVisit={selectedVisit}
          onSelectVisit={onSelectVisit}
          onEditPatient={onEditPatient}
          onEditVisit={onEditVisit}
          onDeleteVisit={onDeleteVisit}
          documents={documents}
          onUpdateHistory={onUpdateHistory}
          insuranceCompanies={insuranceCompanies}
          onUpdateInsurance={onUpdateInsurance}
        />
      )}
    </div>
  );
}
