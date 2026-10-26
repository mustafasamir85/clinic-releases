import { useState } from 'react';
import { Ear, X } from 'lucide-react';
import { COLORS, outlineGoldButtonStyle, twoColumns } from '../../styles';
import { calculateAge, formatDateDMY, getToday } from '../../utils/format';
import { handleEnterAsTab } from '../../utils/form';
import InsuranceSelector, { NO_INSURANCE } from '../../components/common/InsuranceSelector';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import { AudiogramEditor, EMPTY_AUDIOGRAM, audiogramSummary, hasAudiogram } from '../audio/Audiogram';

const EMPTY_FORM = { name: '', birthDate: '', gender: '', phone: '', email: '', address: '' };

export default function PatientModal({ insuranceCompanies, onSubmit, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [insurance, setInsurance] = useState(NO_INSURANCE);
  const [submitting, setSubmitting] = useState(false);
  // تخطيط سمع سابق (اختياري): يُحفظ كزيارة سمعيات بتاريخه
  const [showAudiogram, setShowAudiogram] = useState(false);
  const [audiogram, setAudiogram] = useState(EMPTY_AUDIOGRAM);
  const [audiogramDate, setAudiogramDate] = useState('');
  const [error, setError] = useState('');
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    let previousAudiogram = null;
    if (showAudiogram) {
      if (!hasAudiogram(audiogram)) {
        setError('أدخل قيمة واحدة على الأقل في التخطيط السابق، أو أغلق هذا القسم.');
        return;
      }
      previousAudiogram = {
        date: audiogramDate,
        audiogram,
        summary: ['تخطيط سمع سابق (أُدخل عند تسجيل المريض).', audiogramSummary(audiogram)].filter(Boolean).join(' '),
      };
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ ...form, insurance, previousAudiogram });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="تسجيل مريض جديد"
      subtitle={<>الحقول المعلمة بـ (<span style={{ color: COLORS.danger }}>*</span>) إجبارية</>}
      maxWidth={showAudiogram ? 780 : 520}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <Field label="الاسم الكامل" required>
          <input type="text" value={form.name} onChange={setField('name')} onKeyDown={handleEnterAsTab} className="warm-input" placeholder="اسم المريض الثلاثي/الرباعي" autoFocus required />
        </Field>

        <div style={twoColumns}>
          <Field label="تاريخ الميلاد" required>
            <input type="date" max={getToday()} value={form.birthDate} onChange={setField('birthDate')} onKeyDown={handleEnterAsTab} className="warm-input" required />
          </Field>
          <Field label="الجنس" required>
            <select value={form.gender} onChange={setField('gender')} onKeyDown={handleEnterAsTab} className="warm-select" required>
              <option value="">اختر</option>
              <option value="ذكر">ذكر</option>
              <option value="أنثى">أنثى</option>
            </select>
          </Field>
        </div>

        {form.birthDate && (
          <span style={{ fontSize: '11px', color: COLORS.gold, fontWeight: '700', display: 'block', marginTop: '-8px', marginBottom: '12px' }}>
            التاريخ المحدد: {formatDateDMY(form.birthDate)} ({calculateAge(form.birthDate)} سنة)
          </span>
        )}

        <div style={twoColumns}>
          <Field label="رقم الهاتف" required>
            <input type="text" value={form.phone} onChange={setField('phone')} onKeyDown={handleEnterAsTab} className="warm-input" placeholder="07xxxxxxxx" required dir="ltr" style={{ textAlign: 'right' }} />
          </Field>
          <Field label="البريد الإلكتروني" optional>
            <input type="email" value={form.email} onChange={setField('email')} onKeyDown={handleEnterAsTab} className="warm-input" placeholder="patient@example.com" />
          </Field>
        </div>

        <Field label="العنوان السكني" required>
          <input type="text" value={form.address} onChange={setField('address')} onKeyDown={handleEnterAsTab} className="warm-input" placeholder="المدينة، الشارع، البناية..." required />
        </Field>

        <InsuranceSelector companies={insuranceCompanies} value={insurance} onChange={setInsurance} />

        {!showAudiogram ? (
          <button type="button" onClick={() => setShowAudiogram(true)} style={{ ...outlineGoldButtonStyle, marginTop: '14px' }}>
            <Ear size={15} color={COLORS.gold} /> إدخال تخطيط سمع سابق
          </button>
        ) : (
          <div
            style={{ marginTop: '16px', border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '14px' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); // لا يُحفظ الملف بالخطأ أثناء كتابة قيم التخطيط
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong style={{ color: COLORS.ink, fontSize: '14px' }}>
                <Ear size={15} color={COLORS.gold} style={{ verticalAlign: 'middle', marginLeft: '6px' }} />
                تخطيط السمع السابق
              </strong>
              <button
                type="button"
                onClick={() => {
                  setShowAudiogram(false);
                  setAudiogram(EMPTY_AUDIOGRAM);
                  setAudiogramDate('');
                  setError('');
                }}
                style={{ ...outlineGoldButtonStyle, padding: '4px 10px', fontSize: '12px' }}
              >
                <X size={13} /> إلغاء
              </button>
            </div>

            <Field label="تاريخ إجراء التخطيط" required>
              <input
                type="date"
                className="warm-input"
                min={form.birthDate || undefined}
                max={getToday()}
                value={audiogramDate}
                onChange={(e) => setAudiogramDate(e.target.value)}
                required
              />
            </Field>
            {audiogramDate && (
              <span style={{ fontSize: '11px', color: COLORS.gold, fontWeight: '700', display: 'block', marginTop: '-8px', marginBottom: '10px' }}>
                التاريخ المحدد: {formatDateDMY(audiogramDate)}
              </span>
            )}

            <AudiogramEditor value={audiogram} onChange={setAudiogram} />
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: COLORS.muted }}>
              يُحفظ كزيارة سمعيات سابقة بتاريخها، دون إصدار فاتورة.
            </p>
          </div>
        )}

        {error && (
          <div role="alert" style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: COLORS.dangerBg, color: COLORS.dangerText, fontSize: '13px', fontWeight: '700' }}>
            {error}
          </div>
        )}

        <FormActions onCancel={onClose} submitLabel="إنشاء الملف وحفظه" disabled={submitting} />
      </form>
    </Modal>
  );
}
