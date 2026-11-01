import { FileText, Printer } from 'lucide-react';
import { PrintHeader } from '../../components/common/PrintBrand';
import { CLINIC_NAME, CLINIC_NAME_ENGLISH, CLINIC_SUBTITLE } from '../../constants';
import { calculateAge, formatDateDMY, getFileNumber } from '../../utils/format';
import Modal from '../../components/common/Modal';
import { DOC_TYPES, docLabel, englishTerms, formatDateEN, honorific, isEnglishDoc } from './documentUtils';
import { printReport } from '../../utils/printReport';

// الورقة بيضاء وبحبر داكن دائماً (حتى في الوضع الداكن) لأنها وثيقة للطباعة
const paper = { background: '#fff', color: '#111', border: '1px solid #cfcfcf', borderRadius: '6px', padding: '36px 40px', lineHeight: 2, fontSize: '15px' };

function Section({ title, children }) {
  if (!children) return null;
  return (
    <div style={{ marginTop: '14px' }}>
      <strong>{title}:</strong>
      <p style={{ margin: '2px 0 0 0', whiteSpace: 'pre-wrap' }}>{children}</p>
    </div>
  );
}

// نص الوثيقة الإنجليزية (تقرير أو إجازة). يعيد { intro, closing } بحسب النوع والجنس.
function EnglishBody({ doc, patient, age }) {
  const isLeave = doc.type === 'leave';
  const t = englishTerms(patient);
  const name = doc.patient_name || patient.name;
  const institution = `${CLINIC_NAME_ENGLISH} ${CLINIC_SUBTITLE}`;
  const details = [age != null && !Number.isNaN(age) ? `age: ${age} years` : null, `file no.: ${getFileNumber(patient)}`].filter(Boolean).join(', ');
  const visitDate = formatDateEN(doc.visit_date || doc.date);

  return isLeave ? (
    <>
      <p style={{ margin: 0 }}>
        This is to certify that {t.title} {name} ({details}) attended {institution} on {visitDate}, and {t.possessive} medical
        condition requires sick leave for a period of <strong>({doc.days}) {doc.days === 1 ? 'day' : 'days'}</strong>, starting
        from <strong>{formatDateEN(doc.from)}</strong> and ending on <strong>{formatDateEN(doc.to)}</strong> inclusive.
      </p>
      {doc.show_diagnosis && <Section title="Diagnosis">{doc.diagnosis}</Section>}
    </>
  ) : (
    <>
      <p style={{ margin: 0, fontWeight: '700' }}>{doc.addressed_to}</p>
      <p style={{ margin: '8px 0 0 0' }}>
        This is to certify that {t.title} {name} ({details}) attended {institution} on {visitDate}, and {t.possessive} condition was as follows:
      </p>
      <Section title="Diagnosis">{doc.diagnosis}</Section>
      <Section title="Findings">{doc.findings}</Section>
      <Section title="Recommendations and treatment">{doc.recommendations}</Section>
    </>
  );
}

// معاينة وثيقة (تقرير أو إجازة) بتنسيق الطباعة، بالعربية أو الإنجليزية بحسب doc.lang
export default function DocumentPreviewModal({ doc, patient, onClose }) {
  const isLeave = doc.type === 'leave';
  const english = isEnglishDoc(doc);
  const who = `${honorific(patient)} ${patient.name}`;
  const age = patient.age ?? calculateAge(patient.birth_date);
  const visitText = doc.visit_date ? `بتاريخ ${formatDateDMY(doc.visit_date)}` : `بتاريخ ${formatDateDMY(doc.date)}`;

  // تسميات الأجزاء المشتركة بين اللغتين
  const text = english
    ? {
        no: 'Ref. No.', date: 'Date', title: DOC_TYPES[doc.type].labelEn, notes: 'Notes',
        closing: `This ${isLeave ? 'certificate' : 'report'} was issued at the patient's request and is not valid without the official stamp of the institution.`,
        physician: 'Attending Physician', stamp: 'Official Stamp',
      }
    : {
        no: 'الرقم', date: 'التاريخ', title: DOC_TYPES[doc.type].label, notes: 'ملاحظات',
        closing: `أُعطي هذا ${isLeave ? 'الإثبات' : 'التقرير'} بناءً على طلب المريض، ولا يُعتمد دون ختم المؤسسة.`,
        physician: 'الطبيب المعالج', stamp: 'ختم المؤسسة',
      };

  return (
    <Modal title={docLabel(doc)} icon={FileText} subtitle={`رقم الوثيقة: ${doc.no}`} maxWidth={760} onClose={onClose}>
      <div className={isLeave ? 'print-leave-paper' : 'print-document-paper'} style={paper} dir={english ? 'ltr' : undefined}>
        <PrintHeader lang={english ? 'en' : 'ar'} />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#333' }}>
          <span>{text.no}: {doc.no}</span>
          <span>{text.date}: {english ? formatDateEN(doc.date) : formatDateDMY(doc.date)}</span>
        </div>

        <h2 style={{ textAlign: 'center', margin: '18px 0', fontSize: '22px', textDecoration: 'underline' }}>{text.title}</h2>

        {english ? (
          <EnglishBody doc={doc} patient={patient} age={age} />
        ) : isLeave ? (
          <>
            <p style={{ margin: 0 }}>
              تشهد {CLINIC_NAME} بأن {who} (العمر {age} سنة، رقم الملف {getFileNumber(patient)}) قد راجع العيادة {visitText}،
              وتستدعي حالته الصحية إعطاءه إجازة مرضية لمدة <strong>({doc.days}) {doc.days === 1 ? 'يوم' : 'أيام'}</strong>،
              اعتباراً من تاريخ <strong>{formatDateDMY(doc.from)}</strong> وحتى تاريخ <strong>{formatDateDMY(doc.to)}</strong> شاملاً.
            </p>
            {doc.show_diagnosis && <Section title="التشخيص">{doc.diagnosis}</Section>}
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontWeight: '700' }}>{doc.addressed_to}</p>
            <p style={{ margin: '8px 0 0 0' }}>
              نفيدكم بأن {who} (العمر {age} سنة، رقم الملف {getFileNumber(patient)}) قد راجع {CLINIC_NAME} {visitText}،
              وكانت حالته كما يلي:
            </p>
            <Section title="التشخيص">{doc.diagnosis}</Section>
            <Section title="الفحص والنتائج">{doc.findings}</Section>
            <Section title="التوصيات والعلاج">{doc.recommendations}</Section>
          </>
        )}

        <Section title={text.notes}>{doc.notes}</Section>

        <p style={{ margin: '18px 0 0 0' }}>{text.closing}</p>

        <div className={isLeave ? 'print-leave-signature' : undefined} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontSize: '14px' }}>
          <div style={{ textAlign: 'center' }}>
            <div>{text.physician}</div>
            <div style={{ fontWeight: '700', marginTop: '28px' }}>{english ? doc.issued_by_en || doc.issued_by : doc.issued_by}</div>
            <div style={{ borderTop: '1px solid #111', width: '180px', marginTop: '4px' }} />
          </div>
          <div style={{ textAlign: 'center', alignSelf: 'flex-end', color: '#777' }}>
            <div style={{ border: '1px dashed #999', width: '110px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{text.stamp}</div>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" onClick={() => printReport({ orientation: 'portrait', bodyClass: isLeave ? 'print-leave' : undefined, fit: !isLeave, lang: english ? 'en' : 'ar' })} className="btn-warm-primary" style={{ padding: '8px 20px' }}>
          <Printer size={16} /> طباعة
        </button>
      </div>
    </Modal>
  );
}
