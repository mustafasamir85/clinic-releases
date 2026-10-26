import { Pill, Printer } from 'lucide-react';
import { PrintHeader } from '../../components/common/PrintBrand';
import { calculateAge, formatDateDMY, getFileNumber } from '../../utils/format';
import Modal from '../../components/common/Modal';
import { printReport } from '../../utils/printReport';
import { parsePrescription } from '../../utils/prescription';

// الوصفة تُحفظ نصاً (انظر utils/prescription.js). نُبقي الاسم parseMeds لمن يستورده.
export const parseMeds = parsePrescription;

// الورقة بيضاء وبحبر داكن دائماً لأنها للطباعة (حتى في الوضع الداكن)
const paper = { background: '#fff', color: '#111', border: '1px solid #cfcfcf', borderRadius: '6px', padding: '32px 36px', lineHeight: 1.9, fontSize: '15px' };

// نافذة معاينة وطباعة الوصفة الطبية لزيارة
export default function PrescriptionPrintModal({ patient, visit, onClose }) {
  const meds = parseMeds(visit.prescription);
  const age = patient.age ?? calculateAge(patient.birth_date);

  return (
    <Modal title="الوصفة الطبية" icon={Pill} subtitle={`${patient.name} — زيارة ${formatDateDMY(visit.date)}`} maxWidth={680} onClose={onClose}>
      <div style={paper}>
        <PrintHeader />

        <h2 style={{ textAlign: 'center', margin: '0 0 14px 0', fontSize: '22px', textDecoration: 'underline' }}>وصفة طبية</h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '13.5px', marginBottom: '12px' }}>
          <span>الإسم: <strong>{patient.name}</strong></span>
          <span>العمر: {age} سنة</span>
          <span>رقم الملف: {getFileNumber(patient)}</span>
          <span>التاريخ: {formatDateDMY(visit.date)}</span>
        </div>
        {visit.diagnosis && (
          <div style={{ fontSize: '13.5px', marginBottom: '12px' }}>
            التشخيص: <strong>{visit.diagnosis}</strong>
          </div>
        )}

        {/* جسم الوصفة بالنسق الدولي: ℞ وقائمة الأدوية محاذاة لليسار (الترويسة وبيانات المريض تبقى من اليمين) */}
        <div dir="ltr" style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '34px', fontWeight: '800', fontFamily: 'serif', margin: '10px 0' }}>℞</div>

          <ol style={{ margin: 0, paddingLeft: '26px', paddingRight: 0 }}>
            {meds.map((m, i) => (
              <li key={i} style={{ marginBottom: '8px' }}>
                <strong>{m.name}</strong>
                {m.usage && (
                  <div style={{ fontSize: '13.5px', color: '#333', unicodeBidi: 'plaintext', textAlign: 'left' }}>الاستخدام: {m.usage}</div>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '36px', fontSize: '14px' }}>
          <div style={{ textAlign: 'center' }}>
            <div>الطبيب المعالج</div>
            <div style={{ fontWeight: '700', marginTop: '24px', minHeight: '20px' }}>{visit.doctor ?? ''}</div>
            <div style={{ borderTop: '1px solid #111', width: '170px', marginTop: '4px' }} />
          </div>
          <div style={{ border: '1px dashed #999', width: '100px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#777' }}>ختم المؤسسة</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" onClick={() => printReport({ orientation: 'portrait' })} className="btn-warm-primary" style={{ padding: '8px 20px' }}>
          <Printer size={16} /> طباعة الوصفة
        </button>
      </div>
    </Modal>
  );
}
