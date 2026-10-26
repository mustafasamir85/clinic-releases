import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { COLORS, twoColumns } from '../../styles';
import { getToday } from '../../utils/format';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import PatientSearch from '../../components/common/PatientSearch';

// حجز موعد جديد أو تعديل موعد موجود (item). onSubmit يستقبل بيانات الموعد، ويعيد رسالة خطأ إن وُجد تعارض.
export default function AppointmentModal({ item, patients, defaultDate, onSubmit, onClose }) {
  const [patient, setPatient] = useState(
    item ? patients.find((p) => (item.patient_id ? p.id === item.patient_id : p.name === item.patient_name)) ?? null : null
  );
  const [form, setForm] = useState({
    department: item?.department ?? DEPARTMENTS.ENT,
    date: item?.date ?? defaultDate ?? getToday(),
    time: item?.time ?? '',
    notes: item?.notes ?? '',
  });
  const [error, setError] = useState('');
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // تعديل موعد لمريض غير مرتبط بملف: نبقي اسمه القديم
  const patientName = patient?.name ?? item?.patient_name;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patientName) {
      setError('اختر المريض أولاً.');
      return;
    }
    const message = onSubmit({ ...form, patient_id: patient?.id ?? item?.patient_id ?? null, patient_name: patientName });
    if (message) setError(message);
  };

  return (
    <Modal title={item ? 'تعديل الموعد' : 'حجز موعد جديد'} icon={CalendarPlus} maxWidth={560} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <PatientSearch patients={patients} patient={patient ?? (item ? { name: item.patient_name } : null)} onSelect={setPatient} />

        <Field label="العيادة" required>
          <select value={form.department} onChange={setField('department')} className="warm-select" required>
            <option value={DEPARTMENTS.ENT}>الأنف والأذن والحنجرة (ENT)</option>
            <option value={DEPARTMENTS.AUDIO}>السمعيات والسماعات</option>
            <option value={DEPARTMENTS.SPEECH}>جلسات التخاطب</option>
          </select>
        </Field>

        <div style={{ ...twoColumns, marginTop: '12px' }}>
          <Field label="التاريخ" required>
            <input type="date" className="warm-input" value={form.date} onChange={setField('date')} required />
          </Field>
          <Field label="الوقت" required>
            <input type="time" className="warm-input" value={form.time} onChange={setField('time')} required />
          </Field>
        </div>

        <Field label="ملاحظات" optional style={{ marginTop: '12px' }}>
          <input type="text" className="warm-input" value={form.notes} onChange={setField('notes')} placeholder="سبب الزيارة أو أي ملاحظة..." />
        </Field>

        {error && <p style={{ color: COLORS.danger, fontSize: '13px', fontWeight: '700', margin: '12px 0 0 0' }}>{error}</p>}

        <FormActions onCancel={onClose} submitLabel={item ? 'حفظ التعديل' : 'تأكيد الحجز'} />
      </form>
    </Modal>
  );
}
