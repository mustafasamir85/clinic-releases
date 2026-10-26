import { useState } from 'react';
import { Tag } from 'lucide-react';
import { COLORS, twoColumns } from '../../styles';
import { getToday } from '../../utils/format';
import ManagedListTab from '../../components/common/ManagedListTab';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import StatusBadge from '../../components/common/StatusBadge';
import { offerStatus, offerValueText } from './offerUtils';

const STATUS_TONE = { 'ساري': 'success', 'مجدول': 'neutral', 'منتهي': 'danger', 'موقوف': 'warning' };

function OfferModal({ item, services, onSave, onClose }) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    type: item?.type ?? 'percent',
    value: item ? String(item.value) : '',
    service_id: item?.service_id ? String(item.service_id) : '',
    start: item?.start ?? getToday(),
    end: item?.end ?? '',
    active: item?.active ?? true,
  });
  const [error, setError] = useState('');
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = Number(form.value);
    if (form.type === 'percent' && value > 100) return setError('نسبة الخصم لا تتجاوز 100%.');
    if (form.end && form.end < form.start) return setError('تاريخ نهاية العرض يجب أن يكون بعد تاريخ بدايته.');

    const service = services.find((s) => String(s.id) === form.service_id);
    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      type: form.type,
      value,
      service_id: service?.id ?? '',
      service_name: service?.name ?? '',
      start: form.start,
      end: form.end,
      active: form.active,
    });
  };

  return (
    <Modal title={item ? 'تعديل العرض' : 'إضافة عرض جديد'} icon={Tag} maxWidth={560} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="اسم العرض" required>
          <input type="text" className="warm-input" value={form.name} onChange={setField('name')} placeholder="مثال: خصم الصيف على جلسات التخاطب" required autoFocus />
        </Field>
        <Field label="وصف العرض" optional style={{ marginTop: '12px' }}>
          <input type="text" className="warm-input" value={form.description} onChange={setField('description')} />
        </Field>

        <div style={{ ...twoColumns, marginTop: '12px' }}>
          <Field label="نوع الخصم">
            <select className="warm-select" value={form.type} onChange={setField('type')}>
              <option value="percent">نسبة مئوية (%)</option>
              <option value="fixed">مبلغ ثابت (د.أ)</option>
            </select>
          </Field>
          <Field label={form.type === 'percent' ? 'نسبة الخصم (%)' : 'قيمة الخصم (د.أ)'} required>
            <input type="number" min="0.01" max={form.type === 'percent' ? 100 : undefined} step="0.01" className="warm-input" value={form.value} onChange={setField('value')} required />
          </Field>
        </div>

        <Field label="ينطبق على" style={{ marginTop: '12px' }}>
          <select className="warm-select" value={form.service_id} onChange={setField('service_id')}>
            <option value="">كل بنود الفاتورة</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <div style={{ ...twoColumns, marginTop: '12px' }}>
          <Field label="يبدأ في" required>
            <input type="date" className="warm-input" value={form.start} onChange={setField('start')} required />
          </Field>
          <Field label="ينتهي في" optional>
            <input type="date" className="warm-input" value={form.end} min={form.start} onChange={setField('end')} />
          </Field>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '13px', color: COLORS.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
          العرض مفعّل (يمكن إيقافه مؤقتاً دون حذفه)
        </label>

        {error && <p style={{ color: COLORS.danger, fontSize: '13px', fontWeight: '700', margin: '12px 0 0 0' }} role="alert">{error}</p>}

        <FormActions onCancel={onClose} submitLabel="حفظ العرض" />
      </form>
    </Modal>
  );
}

export default function OffersTab({ list, services, onNotify }) {
  return (
    <ManagedListTab
      title="قائمة العروض والخصومات"
      description="عروض بنسبة أو مبلغ ثابت لفترة محددة، تُطبَّق عند إصدار الفاتورة"
      addLabel="إضافة عرض جديد +"
      icon={Tag}
      list={list}
      onNotify={onNotify}
      messages={{ added: 'تمت إضافة العرض بنجاح!', updated: 'تم تعديل العرض بنجاح!', deleted: 'تم حذف العرض.' }}
      getRow={(o) => {
        const status = offerStatus(o);
        return {
          title: o.name,
          subtitle: [
            o.description,
            o.service_name ? `خاص بـ: ${o.service_name}` : 'على كامل الفاتورة',
            `من ${o.start}${o.end ? ` إلى ${o.end}` : ' (مفتوح)'}`,
          ].filter(Boolean).join(' • '),
          side: (
            <>
              <strong style={{ color: COLORS.successText, background: COLORS.successBg, padding: '4px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                خصم {offerValueText(o)}
              </strong>
              <StatusBadge tone={STATUS_TONE[status]}>{status}</StatusBadge>
            </>
          ),
        };
      }}
      renderModal={(props) => <OfferModal {...props} services={services} />}
    />
  );
}
