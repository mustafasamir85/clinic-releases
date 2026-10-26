import DiagnosisInput from '../../components/common/DiagnosisInput';
import { useState } from 'react';
import { FilePlus2 } from 'lucide-react';
import { COLORS, twoColumns } from '../../styles';
import { formatDateDMY, getFileNumber, getToday } from '../../utils/format';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import { DOC_TYPES, addDays } from './documentUtils';

// نموذج إصدار تقرير طبي أو إجازة مرضية. visit = الزيارة المحددة (تُستخدم لتعبئة القيم الابتدائية).
export default function DocumentModal({ type, patient, visit, onSubmit, onClose }) {
  const isLeave = type === 'leave';
  const [form, setForm] = useState({
    addressed_to: 'إلى من يهمه الأمر',
    diagnosis: visit?.diagnosis ?? visit?.summary ?? '',
    findings: '',
    recommendations: visit?.advice ?? '',
    days: '1',
    from: getToday(),
    show_diagnosis: false,
    notes: '',
  });
  const [error, setError] = useState('');
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // لا تُصدر إجازة بتاريخ سابق (تحقق إضافي لأن حقل التاريخ قد يُتجاوز بالكتابة اليدوية)
    if (isLeave && form.from < getToday()) {
      setError('لا يمكن إصدار إجازة مرضية بتاريخ سابق. اختر تاريخ اليوم أو بعده.');
      return;
    }
    setError('');
    const base = { type, visit_id: visit?.id ?? null, visit_date: visit?.date ?? null, diagnosis: form.diagnosis.trim(), notes: form.notes.trim() };
    onSubmit(
      isLeave
        ? { ...base, days: Number(form.days), from: form.from, to: addDays(form.from, Number(form.days) - 1), show_diagnosis: form.show_diagnosis }
        : { ...base, addressed_to: form.addressed_to.trim(), findings: form.findings.trim(), recommendations: form.recommendations.trim() }
    );
  };

  const leaveEnd = isLeave && Number(form.days) >= 1 && form.from ? addDays(form.from, Number(form.days) - 1) : null;

  return (
    <Modal
      title={`إصدار ${DOC_TYPES[type].label}`}
      icon={FilePlus2}
      subtitle={<>الإسم: <strong style={{ color: COLORS.gold }}>{patient.name}</strong> ({getFileNumber(patient)}){visit && <> • مرتبط بزيارة {formatDateDMY(visit.date)}</>}</>}
      maxWidth={600}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        {isLeave ? (
          <>
            <div style={twoColumns}>
              <Field label="مدة الإجازة (أيام)" required>
                <input type="number" min="1" max="90" step="1" className="warm-input" value={form.days} onChange={setField('days')} required autoFocus />
              </Field>
              <Field label="اعتباراً من تاريخ" required>
                <input type="date" className="warm-input" value={form.from} min={getToday()} onChange={setField('from')} required />
              </Field>
            </div>
            {leaveEnd && <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: COLORS.muted }}>تنتهي الإجازة بتاريخ {formatDateDMY(leaveEnd)}.</p>}

            <Field label="التشخيص" optional style={{ marginTop: '12px' }}>
              <DiagnosisInput multiline rows={2} value={form.diagnosis} onChange={(v) => setForm((f) => ({ ...f, diagnosis: v }))} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px', color: COLORS.text, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.show_diagnosis} onChange={(e) => setForm((f) => ({ ...f, show_diagnosis: e.target.checked }))} />
              إظهار التشخيص في الإجازة (يُترك غير مفعّل حفاظاً على خصوصية المريض)
            </label>
          </>
        ) : (
          <>
            <Field label="موجّه إلى" required>
              <input type="text" className="warm-input" value={form.addressed_to} onChange={setField('addressed_to')} required />
            </Field>
            <Field label="التشخيص" required style={{ marginTop: '12px' }}>
              <DiagnosisInput multiline rows={3} value={form.diagnosis} onChange={(v) => setForm((f) => ({ ...f, diagnosis: v }))} required autoFocus />
            </Field>
            <Field label="الفحص والنتائج" optional style={{ marginTop: '12px' }}>
              <textarea className="warm-textarea" rows="3" value={form.findings} onChange={setField('findings')} placeholder="نتائج الفحص السريري أو تخطيط السمع..." />
            </Field>
            <Field label="التوصيات والعلاج" optional style={{ marginTop: '12px' }}>
              <textarea className="warm-textarea" rows="2" value={form.recommendations} onChange={setField('recommendations')} />
            </Field>
          </>
        )}

        <Field label="ملاحظات إضافية" optional style={{ marginTop: '12px' }}>
          <input type="text" className="warm-input" value={form.notes} onChange={setField('notes')} />
        </Field>

        {error && <p style={{ color: COLORS.danger, fontSize: '13px', fontWeight: '700', margin: '12px 0 0 0' }} role="alert">{error}</p>}

        <FormActions onCancel={onClose} submitLabel="إصدار ومعاينة" submitIcon={FilePlus2} />
      </form>
    </Modal>
  );
}
