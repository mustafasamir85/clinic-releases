import { useMemo, useState } from 'react';
import { Eye, History } from 'lucide-react';
import { COLORS, smallOutlineButtonStyle } from '../../styles';
import { audiogramSummary } from '../../features/audio/Audiogram';
import AudiogramPreviewModal from '../../features/audio/AudiogramPreviewModal';
import { calculateAge, formatDateDMY, formatUser, getFileNumber } from '../../utils/format';
import { stripIngredients } from '../../utils/prescription';
import Modal from './Modal';

// حقول الزيارة الطبية المعروضة (بلا بيانات مالية: الفاتورة والتأمين والخصم)
const VISIT_FIELDS = [
  ['التشخيص', 'diagnosis'],
  ['الملخص والتشخيص', 'summary'],
  ['الوصفة الطبية والعلاج', 'prescription'],
  ['الإجراءات الطبية المنفّذة', 'procedures'],
  ['المستلزمات المستخدمة', 'supplies_used'],
  ['التوصيات والمراجعة', 'advice'],
  ['السماعة الطبية', 'hearing_aid'],
  ['مؤشر التقدم', 'progress'],
];

const chipStyle = (active) => ({
  padding: '6px 14px',
  borderRadius: '10px',
  border: active ? `2px solid ${COLORS.ink}` : `1px solid ${COLORS.border}`,
  background: active ? COLORS.soft : COLORS.white,
  color: active ? COLORS.ink : COLORS.muted,
  fontWeight: '700',
  fontSize: '12.5px',
  cursor: 'pointer',
});

// عرض فقط: التاريخ المرضي العام وسجل زيارات المريض في كل العيادات (الأنف والأذن، السمعيات، التخاطب) مع فلتر بالعيادة
export default function PatientHistoryModal({ patient, onClose }) {
  const [dept, setDept] = useState('');
  const [previewId, setPreviewId] = useState(null); // زيارة يُعرض تخطيط سمعها

  const visits = useMemo(() => [...(patient.visits ?? [])].reverse(), [patient.visits]); // الأحدث أولاً
  const departments = useMemo(() => [...new Set(visits.map((v) => v.department).filter(Boolean))], [visits]);
  const audiogramVisits = useMemo(() => [...visits].reverse().filter((v) => v.audiogram), [visits]); // الأقدم أولاً كما تتوقع المعاينة
  const shown = dept ? visits.filter((v) => v.department === dept) : visits;

  // أثناء المعاينة تُخفى هذه النافذة (Escape يغلق المعاينة فقط ثم نعود للتاريخ)
  if (previewId !== null) {
    return <AudiogramPreviewModal patient={patient} visits={audiogramVisits} initialVisitId={previewId} onClose={() => setPreviewId(null)} />;
  }

  return (
    <Modal
      title="التاريخ المرضي للمريض"
      icon={History}
      subtitle={`${patient.name} • ${getFileNumber(patient)} • ${patient.age ?? calculateAge(patient.birth_date)} سنة${patient.gender ? ` • ${patient.gender}` : ''}`}
      maxWidth={760}
      onClose={onClose}
    >
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '12px 14px', marginBottom: '16px' }}>
        <strong style={{ fontSize: '13px', color: COLORS.text }}>التاريخ المرضي العام والتوصيات الثابتة:</strong>
        <p style={{ margin: '6px 0 0 0', fontSize: '13.5px', color: COLORS.ink, whiteSpace: 'pre-wrap' }}>
          {patient.medical_history || 'لا يوجد تاريخ مرضي عام.'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <button type="button" onClick={() => setDept('')} style={chipStyle(!dept)}>الكل ({visits.length})</button>
        {departments.map((d) => (
          <button key={d} type="button" onClick={() => setDept(d)} style={chipStyle(dept === d)}>
            {d} ({visits.filter((v) => v.department === d).length})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p style={{ color: COLORS.faint, fontSize: '13px' }}>لا توجد زيارات سابقة مسجلة لهذا المريض.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto', paddingInlineEnd: '4px' }}>
          {shown.map((v) => {
            const by = formatUser(v.created_by ?? v.doctor, v.created_by_username);
            const hearing = v.audiogram ? audiogramSummary(v.audiogram) : '';
            const fields = VISIT_FIELDS.filter(([, key]) => v[key]);
            return (
              <div key={v.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '13.5px', color: COLORS.ink }}>📅 {formatDateDMY(v.date)}</strong>
                  <span style={{ background: COLORS.soft, color: COLORS.ink, border: `1px solid ${COLORS.border}`, padding: '2px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
                    {v.department}
                  </span>
                </div>
                {by && <div style={{ fontSize: '12px', color: COLORS.muted, marginBottom: '8px' }}>👤 {by}</div>}
                {v.audiogram && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', margin: '0 0 8px 0', fontSize: '13px' }}>
                    <span>
                      <strong style={{ color: COLORS.text }}>تخطيط السمع:</strong> {hearing || 'قيم غير كافية لحساب المتوسط'}
                    </span>
                    <button type="button" onClick={() => setPreviewId(v.id)} style={smallOutlineButtonStyle}>
                      <Eye size={14} color={COLORS.gold} /> معاينة التخطيط
                    </button>
                  </div>
                )}
                {fields.length === 0 && !v.audiogram && <p style={{ margin: 0, fontSize: '13px', color: COLORS.faint }}>لا توجد تفاصيل مسجلة لهذه الزيارة.</p>}
                {fields.map(([label, key]) => (
                  <p key={key} style={{ margin: '0 0 6px 0', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                    <strong style={{ color: COLORS.text }}>{label}:</strong> <span style={{ color: COLORS.ink }}>{key === 'prescription' ? stripIngredients(v[key]) : v[key]}</span>
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
