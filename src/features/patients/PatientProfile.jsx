import InsuranceSelector from '../../components/common/InsuranceSelector';
import { insuranceFromPatient } from '../../hooks/usePatientInsurance';
import { Clock, Hash, Eye, Ear, FileText, Printer, Trash2, CalendarOff } from 'lucide-react';
import { useState } from 'react';
import { audiogramSummary } from '../audio/Audiogram';
import PrescriptionPrintModal from '../ent/PrescriptionPrintModal';
import DocumentModal from '../documents/DocumentModal';
import DocumentPreviewModal from '../documents/DocumentPreviewModal';
import { DOC_TYPES } from '../documents/documentUtils';
import AudiogramPreviewModal from '../audio/AudiogramPreviewModal';
import { CollapsibleSection, Panel, EditDeleteActions } from '../../components/common/layout';
import { COLORS, outlineGoldButtonStyle, smallOutlineButtonStyle } from '../../styles';
import { calculateAge, formatDateDMY, formatMoney, formatUser, getFileNumber } from '../../utils/format';

const InfoItem = ({ label, value, color, span }) => (
  <div style={span ? { gridColumn: `span ${span}` } : undefined}>
    <span style={{ fontSize: '11px', color: COLORS.faint }}>{label}</span>
    <p style={{ margin: '2px 0 0 0', fontWeight: '700', fontSize: '14px', color }}>{value}</p>
  </div>
);

function VisitDetails({ visit, onEdit, onDelete, onPreviewAudiogram, onPrintPrescription }) {
  const fields = [
    { label: 'التشخيص', value: visit.diagnosis, color: COLORS.ink, bold: true },
    { label: 'الملخص والتشخيص', value: visit.summary, color: COLORS.ink, bold: false },
    { label: 'الوصفة الطبية والعلاج', value: visit.prescription, color: COLORS.gold, bold: true },
    { label: 'الإجراءات الطبية المنفّذة', value: visit.procedures, color: COLORS.ink, bold: true },
    { label: 'المستلزمات المستخدمة', value: visit.supplies_used, color: COLORS.ink, bold: false },
    {
      label: 'التأمين الطبي',
      value: visit.insurance_company
        ? `${visit.insurance_company} — ${visit.insurance_copay != null ? `تحمّل المريض ${formatMoney(visit.insurance_copay)}` : `تغطية ${visit.insurance_coverage}%`}`
        : '',
      color: COLORS.successText,
      bold: true,
    },
    { label: 'الخصم', value: visit.discount ? formatMoney(visit.discount) : '', color: COLORS.successText, bold: true },
    { label: 'التوصيات والمراجعة', value: visit.advice, color: COLORS.ink, bold: false },
    { label: 'السماعة الطبية', value: visit.hearing_aid, color: COLORS.ink, bold: true },
    { label: 'مؤشر التقدم', value: visit.progress, color: COLORS.ink, bold: false },
  ].filter((f) => f.value);

  // المستخدم الذي سجّل الزيارة (الزيارات القديمة فيها اسم الطبيب فقط) ومن عدّلها آخر مرة
  const recordedBy = formatUser(visit.created_by ?? visit.doctor, visit.created_by_username);
  const editedBy = formatUser(visit.updated_by, visit.updated_by_username);

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '20px', marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontWeight: '800', color: COLORS.ink, fontSize: '14px' }}>
          تفاصيل الإجراءات في زيارة: {formatDateDMY(visit.date)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ background: COLORS.soft, color: COLORS.ink, border: `1px solid ${COLORS.border}`, padding: '2px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
            {visit.department}
          </span>
          {onEdit && onDelete && <EditDeleteActions onEdit={onEdit} onDelete={onDelete} />}
        </div>
      </div>

      {visit.audiogram && (
        <div style={{ margin: '0 0 14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <strong style={{ color: COLORS.text, fontSize: '13.5px' }}>تخطيط السمع:</strong>
            <button type="button" onClick={onPreviewAudiogram} style={smallOutlineButtonStyle}>
              <Eye size={14} color={COLORS.gold} /> معاينة وتكبير
            </button>
          </div>
          {audiogramSummary(visit.audiogram) && (
            <p style={{ margin: '8px 0 0 0', color: COLORS.ink, fontWeight: '700', fontSize: '13px' }}>{audiogramSummary(visit.audiogram)}</p>
          )}
        </div>
      )}

      {(recordedBy || editedBy) && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', margin: '0 0 12px 0', fontSize: '12px', color: COLORS.muted }}>
          {recordedBy && <span>👤 سُجّلت بواسطة: <strong style={{ color: COLORS.ink }}>{recordedBy}</strong></span>}
          {editedBy && <span>✏️ آخر تعديل بواسطة: <strong style={{ color: COLORS.ink }}>{editedBy}</strong>{visit.updated_at ? ` (${formatDateDMY(visit.updated_at)})` : ''}</span>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
        {fields.map((f) => (
          <div key={f.label}>
            <strong style={{ color: COLORS.text }}>{f.label}:</strong>
            <p style={{ margin: '4px 0 0 0', color: f.color, fontWeight: f.bold ? '700' : 'normal' }}>{f.value}</p>
            {f.label === 'الوصفة الطبية والعلاج' && (
              <button type="button" onClick={onPrintPrescription} style={{ ...smallOutlineButtonStyle, marginTop: '6px' }}>
                <Printer size={14} color={COLORS.gold} /> طباعة الوصفة
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PatientProfile({ patient, insuranceCompanies, selectedVisit, onSelectVisit, onEditVisit, onDeleteVisit, documents, onUpdateHistory, onUpdateInsurance }) {
  const visits = patient.visits ?? [];
  const audiogramVisits = visits.filter((v) => v.audiogram);
  const [rxVisitId, setRxVisitId] = useState(null); // زيارة تُطبع وصفتها
  const [previewId, setPreviewId] = useState(null); // معرّف الزيارة المفتوح تخطيطها
  const fileNumber = getFileNumber(patient);

  // الوثائق الصادرة (تقرير طبي / إجازة مرضية). documents = { onIssue?, onDelete? } حسب صلاحيتي الإصدار والحذف (undefined = لا يملك أيّاً منهما).
  const patientDocs = patient.documents ?? [];
  const [docForm, setDocForm] = useState(null); // نوع النموذج المفتوح: 'report' | 'leave'
  const [viewDocId, setViewDocId] = useState(null);
  const viewDoc = patientDocs.find((d) => d.id === viewDocId) ?? null;

  const handleIssue = (data) => {
    const doc = documents.onIssue(patient.id, data);
    setDocForm(null);
    setViewDocId(doc.id); // نفتح الوثيقة فور إصدارها للطباعة
  };

  return (
    <div className="warm-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
            ملف المريض: <span style={{ color: COLORS.gold }}>{patient.name}</span>
          </h3>
          <span style={{ background: COLORS.primary, color: COLORS.onPrimary, padding: '3px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Hash size={12} color={COLORS.gold} /> {fileNumber}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {documents?.onIssue && (
            <>
              <button onClick={() => setDocForm('report')} style={outlineGoldButtonStyle}>
                <FileText size={16} color={COLORS.gold} /> تقرير طبي
              </button>
              <button onClick={() => setDocForm('leave')} style={outlineGoldButtonStyle}>
                <CalendarOff size={16} color={COLORS.gold} /> إجازة مرضية
              </button>
            </>
          )}
        </div>
      </div>

      <Panel title="البيانات الشخصية" style={{ marginBottom: '20px' }}>
      <div className="grid-2m" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <InfoItem label="رقم الملف" value={fileNumber} color={COLORS.gold} />
        <InfoItem label="تاريخ الميلاد" value={formatDateDMY(patient.birth_date)} />
        <InfoItem label="العمر" value={`${patient.age ?? calculateAge(patient.birth_date)} سنة`} />
        <InfoItem label="الجنس" value={patient.gender} />
        <InfoItem label="الهاتف" value={patient.phone ? <bdi dir="ltr">{patient.phone}</bdi> : patient.phone} />
        <InfoItem label="البريد الإلكتروني" value={patient.email || 'غير مسجل'} />
        <InfoItem label="العنوان السكني" value={patient.address || 'غير مسجل'} span={2} />
      </div>
      </Panel>

      <CollapsibleSection style={{ marginTop: '20px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '20px' }} header={
        <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color={COLORS.gold} /> سجل الزيارات السابقة والإجراءات الطبية
        </h4>
}>

        {visits.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {visits.map((visit) => {
                const active = selectedVisit?.id === visit.id;
                return (
                  <button
                    key={visit.id}
                    onClick={() => onSelectVisit(visit.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      border: active ? `2px solid ${COLORS.ink}` : `1px solid ${COLORS.border}`,
                      background: active ? COLORS.soft : COLORS.white,
                      color: active ? COLORS.ink : COLORS.muted,
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>📅 {formatDateDMY(visit.date)}</span>
                    <span style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '6px', fontSize: '11px' }}>{visit.department}</span>
                  </button>
                );
              })}
            </div>

            {selectedVisit && (
              <VisitDetails
                visit={selectedVisit}
                onEdit={onEditVisit ? () => onEditVisit(selectedVisit) : undefined}
                onDelete={onDeleteVisit ? () => onDeleteVisit(selectedVisit) : undefined}
                onPreviewAudiogram={() => setPreviewId(selectedVisit.id)}
                onPrintPrescription={() => setRxVisitId(selectedVisit.id)}
              />
            )}
          </div>
        ) : (
          <p style={{ color: COLORS.faint, fontSize: '13px' }}>لا توجد زيارات سابقة مسجلة لهذا المريض.</p>
        )}
      </CollapsibleSection>

      {audiogramVisits.length > 0 && (
        <CollapsibleSection style={{ marginTop: '24px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '20px' }} header={
          <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ear size={16} color={COLORS.gold} /> تخطيطات السمع المحفوظة ({audiogramVisits.length})
          </h4>
}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...audiogramVisits].reverse().map((v) => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '10px 14px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: COLORS.ink }}>📅 {formatDateDMY(v.date)}</strong>
                  <span style={{ display: 'block', fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>
                    {audiogramSummary(v.audiogram) || 'قيم غير كافية لحساب المتوسط'}
                  </span>
                </div>
                <button type="button" onClick={() => setPreviewId(v.id)} style={smallOutlineButtonStyle}>
                  <Eye size={14} color={COLORS.gold} /> معاينة
                </button>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {patientDocs.length > 0 && (
        <CollapsibleSection style={{ marginTop: '24px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '20px' }} header={
          <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color={COLORS.gold} /> التقارير الطبية والإجازات الصادرة ({patientDocs.length})
          </h4>
}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...patientDocs].reverse().map((d) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '10px 14px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: COLORS.ink }}>{DOC_TYPES[d.type].label} • {d.no}</strong>
                  <span style={{ display: 'block', fontSize: '12px', color: COLORS.muted, marginTop: '2px' }}>
                    📅 {formatDateDMY(d.date)}
                    {d.type === 'leave' ? ` • ${d.days} يوم (${formatDateDMY(d.from)} – ${formatDateDMY(d.to)})` : ''}
                    {d.issued_by ? ` • ${d.issued_by}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button type="button" onClick={() => setViewDocId(d.id)} style={smallOutlineButtonStyle}>
                    <Printer size={14} color={COLORS.gold} /> معاينة وطباعة
                  </button>
                  {documents?.onDelete && (
                    <button
                      type="button"
                      aria-label="حذف الوثيقة"
                      onClick={() => window.confirm('حذف هذه الوثيقة من الملف؟') && documents.onDelete(patient.id, d.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: COLORS.danger }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {docForm && documents?.onIssue && (
        <DocumentModal type={docForm} patient={patient} visit={selectedVisit} onSubmit={handleIssue} onClose={() => setDocForm(null)} />
      )}
      {rxVisitId && visits.find((v) => v.id === rxVisitId) && (
        <PrescriptionPrintModal patient={patient} visit={visits.find((v) => v.id === rxVisitId)} onClose={() => setRxVisitId(null)} />
      )}
      {viewDoc && <DocumentPreviewModal doc={viewDoc} patient={patient} onClose={() => setViewDocId(null)} />}

      {previewId !== null && (
        <AudiogramPreviewModal patient={patient} visits={audiogramVisits} initialVisitId={previewId} onClose={() => setPreviewId(null)} />
      )}

      <div style={{ marginTop: '24px' }}>
        <InsuranceSelector
          companies={insuranceCompanies}
          value={insuranceFromPatient(patient)}
          onChange={(value) => onUpdateInsurance(patient.id, value)}
        />
      </div>

      <Panel title="التاريخ المرضي العام والتوصيات الثابتة" style={{ marginTop: '24px' }}>
        {/* key يعيد تهيئة الحقل عند تبديل المريض */}
        <textarea
          key={patient.id}
          className="warm-textarea"
          rows="2"
          defaultValue={patient.medical_history || 'لا يوجد تاريخ مرضي عام.'}
          onBlur={(e) => onUpdateHistory(patient.id, e.target.value)}
        />
      </Panel>
    </div>
  );
}
