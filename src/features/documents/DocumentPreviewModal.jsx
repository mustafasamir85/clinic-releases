import { FileText, Printer } from 'lucide-react';
import { PrintHeader } from '../../components/common/PrintBrand';
import { CLINIC_NAME } from '../../constants';
import { calculateAge, formatDateDMY, getFileNumber } from '../../utils/format';
import Modal from '../../components/common/Modal';
import { DOC_TYPES, honorific } from './documentUtils';
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

// معاينة وثيقة (تقرير أو إجازة) بتنسيق الطباعة
export default function DocumentPreviewModal({ doc, patient, onClose }) {
  const isLeave = doc.type === 'leave';
  const who = `${honorific(patient)} ${patient.name}`;
  const age = patient.age ?? calculateAge(patient.birth_date);
  const visitText = doc.visit_date ? `بتاريخ ${formatDateDMY(doc.visit_date)}` : `بتاريخ ${formatDateDMY(doc.date)}`;

  return (
    <Modal title={DOC_TYPES[doc.type].label} icon={FileText} subtitle={`رقم الوثيقة: ${doc.no}`} maxWidth={760} onClose={onClose}>
      <div className={isLeave ? 'print-leave-paper' : 'print-document-paper'} style={paper}>
        <PrintHeader />

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#333' }}>
          <span>الرقم: {doc.no}</span>
          <span>التاريخ: {formatDateDMY(doc.date)}</span>
        </div>

        <h2 style={{ textAlign: 'center', margin: '18px 0', fontSize: '22px', textDecoration: 'underline' }}>{DOC_TYPES[doc.type].label}</h2>

        {isLeave ? (
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

        <Section title="ملاحظات">{doc.notes}</Section>

        <p style={{ margin: '18px 0 0 0' }}>أُعطي هذا {isLeave ? 'الإثبات' : 'التقرير'} بناءً على طلب المريض، ولا يُعتمد دون ختم المؤسسة.</p>

        <div className={isLeave ? 'print-leave-signature' : undefined} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontSize: '14px' }}>
          <div style={{ textAlign: 'center' }}>
            <div>الطبيب المعالج</div>
            <div style={{ fontWeight: '700', marginTop: '28px' }}>{doc.issued_by}</div>
            <div style={{ borderTop: '1px solid #111', width: '180px', marginTop: '4px' }} />
          </div>
          <div style={{ textAlign: 'center', alignSelf: 'flex-end', color: '#777' }}>
            <div style={{ border: '1px dashed #999', width: '110px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>ختم المؤسسة</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" onClick={() => printReport({ orientation: 'portrait', bodyClass: isLeave ? 'print-leave' : undefined })} className="btn-warm-primary" style={{ padding: '8px 20px' }}>
          <Printer size={16} /> طباعة
        </button>
      </div>
    </Modal>
  );
}
