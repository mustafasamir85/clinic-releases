import DiagnosisInput from '../../components/common/DiagnosisInput';
import { useState } from 'react';
import { FilePlus2 } from 'lucide-react';
import { COLORS, twoColumns } from '../../styles';
import { formatDateDMY, getFileNumber, getToday } from '../../utils/format';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import { DOC_LANGS, DOC_TYPES, addDays, guessEnglishName } from './documentUtils';

const ADDRESSEE = { ar: 'إلى من يهمه الأمر', en: 'To Whom It May Concern' };

// نموذج إصدار تقرير طبي أو إجازة مرضية (بالعربية أو الإنجليزية). visit = الزيارة المحددة (تُستخدم لتعبئة القيم الابتدائية).
// doctorNameEn = الاسم الإنجليزي المحفوظ للطبيب المُصدِر (من حسابه)، ويمكن تعديله هنا قبل الإصدار.
export default function DocumentModal({ type, patient, visit, doctorNameEn = '', onSubmit, onClose }) {
  const isLeave = type === 'leave';
  const [lang, setLang] = useState('ar');
  const english = lang === 'en';
  const [form, setForm] = useState({
    addressed_to: ADDRESSEE.ar,
    patient_name: guessEnglishName(patient), // اسم المريض بالإنجليزية (للوثيقة الإنجليزية فقط)
    doctor_name_en: doctorNameEn, // اسم الطبيب بالإنجليزية (للوثيقة الإنجليزية فقط)
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

  // تبديل اللغة يبدّل عبارة "موجّه إلى" الافتراضية فقط إن لم يغيّرها المستخدم
  const changeLang = (next) => {
    setLang(next);
    setForm((f) => (Object.values(ADDRESSEE).includes(f.addressed_to) ? { ...f, addressed_to: ADDRESSEE[next] } : f));
  };

  // حقول النص الإنجليزي تُكتب من اليسار
  const textDir = english ? { dir: 'ltr', style: { textAlign: 'left' } } : {};

  const handleSubmit = (e) => {
    e.preventDefault();
    // لا تُصدر إجازة بتاريخ سابق (تحقق إضافي لأن حقل التاريخ قد يُتجاوز بالكتابة اليدوية)
    if (isLeave && form.from < getToday()) {
      setError('لا يمكن إصدار إجازة مرضية بتاريخ سابق. اختر تاريخ اليوم أو بعده.');
      return;
    }
    if (english && !form.patient_name.trim()) {
      setError('اكتب اسم المريض بالإنجليزية ليظهر في الوثيقة الإنجليزية.');
      return;
    }
    if (english && !form.doctor_name_en.trim()) {
      setError('اكتب اسم الطبيب بالإنجليزية ليظهر في الوثيقة الإنجليزية.');
      return;
    }
    setError('');
    const base = {
      type,
      lang,
      ...(english ? { patient_name: form.patient_name.trim(), issued_by_en: form.doctor_name_en.trim() } : {}),
      visit_id: visit?.id ?? null,
      visit_date: visit?.date ?? null,
      diagnosis: form.diagnosis.trim(),
      notes: form.notes.trim(),
    };
    onSubmit(
      isLeave
        ? { ...base, days: Number(form.days), from: form.from, to: addDays(form.from, Number(form.days) - 1), show_diagnosis: form.show_diagnosis }
        : { ...base, addressed_to: form.addressed_to.trim(), findings: form.findings.trim(), recommendations: form.recommendations.trim() }
    );
  };

  const leaveEnd = isLeave && Number(form.days) >= 1 && form.from ? addDays(form.from, Number(form.days) - 1) : null;

  return (
    <Modal warnUnsaved
      title={`إصدار ${DOC_TYPES[type].label}`}
      icon={FilePlus2}
      subtitle={<>الإسم: <strong style={{ color: COLORS.gold }}>{patient.name}</strong> ({getFileNumber(patient)}){visit && <> • مرتبط بزيارة {formatDateDMY(visit.date)}</>}</>}
      maxWidth={600}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <Field label="لغة الوثيقة" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }} role="radiogroup" aria-label="لغة الوثيقة">
            {Object.entries(DOC_LANGS).map(([key, name]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={lang === key}
                onClick={() => changeLang(key)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  border: `1.5px solid ${lang === key ? COLORS.gold : COLORS.border}`,
                  background: lang === key ? COLORS.soft : COLORS.card,
                  color: lang === key ? COLORS.gold : COLORS.text,
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </Field>

        {english && (
          <>
            <Field label="اسم المريض بالإنجليزية (كما سيظهر في الوثيقة)" required>
              <input type="text" className="warm-input" dir="ltr" style={{ textAlign: 'left' }} placeholder="e.g. Ahmad Mohammad Ali" value={form.patient_name} onChange={setField('patient_name')} required />
            </Field>
            <Field label="اسم الطبيب بالإنجليزية (كما سيظهر في التوقيع)" required style={{ marginTop: '12px' }}>
              <input type="text" className="warm-input" dir="ltr" style={{ textAlign: 'left' }} placeholder="e.g. Dr. Sara Al-Ahmad" value={form.doctor_name_en} onChange={setField('doctor_name_en')} required />
            </Field>
            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: COLORS.muted }}>
              اكتب التشخيص والنتائج والتوصيات والملاحظات أدناه بالإنجليزية لتظهر كذلك في الوثيقة.
            </p>
          </>
        )}

        {isLeave ? (
          <>
            <div style={{ ...twoColumns, marginTop: '12px' }}>
              <Field label="مدة الإجازة (أيام)" required>
                <input type="number" min="1" max="90" step="1" className="warm-input" value={form.days} onChange={setField('days')} required autoFocus />
              </Field>
              <Field label="اعتباراً من تاريخ" required>
                <input type="date" className="warm-input" value={form.from} min={getToday()} onChange={setField('from')} required />
              </Field>
            </div>
            {leaveEnd && <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: COLORS.muted }}>تنتهي الإجازة بتاريخ {formatDateDMY(leaveEnd)}.</p>}

            <Field label="التشخيص" optional style={{ marginTop: '12px' }}>
              <div {...textDir}>
                <DiagnosisInput multiline rows={2} value={form.diagnosis} onChange={(v) => setForm((f) => ({ ...f, diagnosis: v }))} />
              </div>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px', color: COLORS.text, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.show_diagnosis} onChange={(e) => setForm((f) => ({ ...f, show_diagnosis: e.target.checked }))} />
              إظهار التشخيص في الإجازة (يُترك غير مفعّل حفاظاً على خصوصية المريض)
            </label>
          </>
        ) : (
          <>
            <Field label="موجّه إلى" required style={{ marginTop: '12px' }}>
              <input type="text" className="warm-input" {...textDir} value={form.addressed_to} onChange={setField('addressed_to')} required />
            </Field>
            <Field label="التشخيص" required style={{ marginTop: '12px' }}>
              <div {...textDir}>
                <DiagnosisInput multiline rows={3} value={form.diagnosis} onChange={(v) => setForm((f) => ({ ...f, diagnosis: v }))} required autoFocus />
              </div>
            </Field>
            <Field label="الفحص والنتائج" optional style={{ marginTop: '12px' }}>
              <textarea className="warm-textarea" rows="3" {...textDir} value={form.findings} onChange={setField('findings')} placeholder={english ? 'Clinical examination or audiogram findings...' : 'نتائج الفحص السريري أو تخطيط السمع...'} />
            </Field>
            <Field label="التوصيات والعلاج" optional style={{ marginTop: '12px' }}>
              <textarea className="warm-textarea" rows="2" {...textDir} value={form.recommendations} onChange={setField('recommendations')} />
            </Field>
          </>
        )}

        <Field label="ملاحظات إضافية" optional style={{ marginTop: '12px' }}>
          <input type="text" className="warm-input" {...textDir} value={form.notes} onChange={setField('notes')} />
        </Field>

        {error && <p style={{ color: COLORS.danger, fontSize: '13px', fontWeight: '700', margin: '12px 0 0 0' }} role="alert">{error}</p>}

        <FormActions onCancel={onClose} submitLabel="إصدار ومعاينة" submitIcon={FilePlus2} />
      </form>
    </Modal>
  );
}
