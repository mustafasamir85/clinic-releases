import { useState } from 'react';
import { Save } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import InsuranceSelector, { insuranceDetails } from '../../components/common/InsuranceSelector';
import ChargesPicker, { EMPTY_CHARGES } from '../../components/common/ChargesPicker';
import { AudiogramEditor, EMPTY_AUDIOGRAM, hasAudiogram } from '../audio/Audiogram';
import { COLORS, twoColumns } from '../../styles';
import { getFileNumber } from '../../utils/format';
import DiagnosisInput from '../../components/common/DiagnosisInput';

// شركة التأمين تُحفظ في الزيارة بالاسم، فنبحث عنها بالاسم لإعادة بناء الاختيار
const insuranceFromVisit = (visit, companies) => {
  const company = companies.find((c) => c.name === visit.insurance_company);
  return company
    ? { companyId: String(company.id), copay: String(visit.insurance_copay ?? '') } // الزيارات القديمة (نسبة) تُدخَل لها قيمة التحمّل يدوياً
    : { companyId: '', copay: '' };
};

// الحقل يظهر إن كان يخص قسم الزيارة أو كانت له قيمة محفوظة أصلاً
const showField = (visit, key, dept) => visit.department === dept || Boolean(visit[key]);

export default function VisitEditModal({ patient, visit, offers = [], services, supplies, insuranceCompanies, onSubmit, onClose }) {
  // الإجراءات قابلة للتعديل إن كانت محفوظة بشكل منظّم، أو إن لم يكن للزيارة فاتورة (لإضافتها لأول مرة).
  // الزيارات القديمة (نصوص بلا تفاصيل منظّمة) وزيارة بيع السماعة لا نمسّها.
  const chargesEditable = Boolean(visit.charges) || (!visit.invoice_id && !visit.procedures && !visit.supplies_used);
  const [charges, setCharges] = useState(visit.charges ?? EMPTY_CHARGES);

  // الكمية المتاحة للتعديل = المخزون الحالي + ما خُصم لهذه الزيارة أصلاً
  const usedBefore = new Map((visit.charges?.supplies ?? []).map((s) => [s.id, s.qty]));
  const availableSupplies = supplies.map((s) => ({ ...s, stock: s.stock + (usedBefore.get(s.id) ?? 0) }));
  const deptServices = services.filter((s) => s.dept === visit.department);

  const [form, setForm] = useState({
    date: visit.date ?? '',
    diagnosis: visit.diagnosis ?? '',
    summary: visit.summary ?? '',
    prescription: visit.prescription ?? '',
    advice: visit.advice ?? '',
    hearing_aid: visit.hearing_aid ?? '',
    progress: visit.progress ?? '',
  });
  const [audiogram, setAudiogram] = useState(visit.audiogram ?? EMPTY_AUDIOGRAM);
  const [insurance, setInsurance] = useState(() => insuranceFromVisit(visit, insuranceCompanies));
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(
      {
      ...form,
      audiogram: hasAudiogram(audiogram) ? audiogram : null,
      // نصفّر حقلي التأمين أولاً كي يُحذفا فعلاً إن أُلغي التأمين، ثم نضيف الجديد
      insurance_company: '',
      insurance_copay: '',
      insurance_coverage: undefined, // حقل النسبة القديم لم يعد مستخدماً
      ...insuranceDetails(insurance, insuranceCompanies),
      },
      chargesEditable ? charges : null
    );
  };

  return (
    <Modal
      title="تعديل تفاصيل الزيارة"
      subtitle={<>المريض: <strong style={{ color: COLORS.gold }}>{patient.name}</strong> ({getFileNumber(patient)}) • القسم: {visit.department}</>}
      maxWidth={620}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <Field label="تاريخ الزيارة" required>
          <input type="date" className="warm-input" value={form.date} onChange={setField('date')} required />
        </Field>

        <Field label="التشخيص" optional style={{ marginTop: '12px' }}>
          <DiagnosisInput value={form.diagnosis} onChange={(v) => setForm((f) => ({ ...f, diagnosis: v }))} />
        </Field>

        <Field label="الفحص والتشخيص / ملخص الزيارة" required style={{ marginTop: '12px' }}>
          <textarea className="warm-textarea" rows="3" value={form.summary} onChange={setField('summary')} required />
        </Field>

        {showField(visit, 'prescription', DEPARTMENTS.ENT) && (
          <Field label="الوصفة الطبية والعلاج" style={{ marginTop: '12px' }}>
            <textarea className="warm-textarea" rows="2" value={form.prescription} onChange={setField('prescription')} />
          </Field>
        )}

        {(visit.department === DEPARTMENTS.AUDIO || visit.audiogram) && (
          <Field label="تخطيط السمع" style={{ marginTop: '12px' }}>
            <AudiogramEditor value={audiogram} onChange={setAudiogram} />
          </Field>
        )}

        <div style={{ ...twoColumns, marginTop: '12px' }}>
          {showField(visit, 'hearing_aid', DEPARTMENTS.AUDIO) && (
            <Field label="السماعة الطبية">
              <input type="text" className="warm-input" value={form.hearing_aid} onChange={setField('hearing_aid')} />
            </Field>
          )}
          {showField(visit, 'progress', DEPARTMENTS.SPEECH) && (
            <Field label="مؤشر التقدم">
              <textarea className="warm-textarea" rows="2" value={form.progress} onChange={setField('progress')} />
            </Field>
          )}
        </div>

        {showField(visit, 'advice', DEPARTMENTS.AUDIO) && (
          <Field label="التوصيات والمراجعة" style={{ marginTop: '12px' }}>
            <textarea className="warm-textarea" rows="2" value={form.advice} onChange={setField('advice')} />
          </Field>
        )}

        <div style={{ marginTop: '16px' }}>
          {chargesEditable ? (
            <>
              <ChargesPicker procedures={deptServices} supplies={availableSupplies} value={charges} onChange={setCharges} offers={offers} services={services} />
              <p style={{ margin: '-8px 0 0 0', fontSize: '12px', color: COLORS.muted }}>
                عند الحفظ تُحدَّث فاتورة الزيارة والمخزون تلقائياً بحسب التغيير.
              </p>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: '12px', color: COLORS.muted }}>
              إجراءات هذه الزيارة (بيع سماعة أو زيارة مسجّلة سابقاً كنص) لا تُعدَّل من هنا.
            </p>
          )}
        </div>

        <div style={{ marginTop: '16px' }}>
          <InsuranceSelector companies={insuranceCompanies} value={insurance} onChange={setInsurance} />
        </div>

        <FormActions onCancel={onClose} submitLabel="حفظ التعديلات" submitIcon={Save} />
      </form>
    </Modal>
  );
}
