import { ltr } from '../../utils/phone';
import { useState } from 'react';
import { Shield } from 'lucide-react';
import { INSURANCE_STATUS } from '../../constants';
import ManagedListTab from '../../components/common/ManagedListTab';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import StatusBadge from '../../components/common/StatusBadge';

const STATUS_TONE = {
  [INSURANCE_STATUS.APPROVED]: 'success',
  [INSURANCE_STATUS.REVIEW]: 'warning',
  [INSURANCE_STATUS.SUSPENDED]: 'danger',
};

function InsuranceModal({ item, onSave, onClose }) {
  const [name, setName] = useState(item?.name ?? '');
  const [status, setStatus] = useState(item?.status ?? INSURANCE_STATUS.APPROVED);
  const [contact, setContact] = useState(item?.contact === 'غير مسجل' ? '' : item?.contact ?? '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name: name.trim(), status, contact: contact.trim() || 'غير مسجل' });
  };

  return (
    <Modal title={item ? 'تعديل شركة التأمين' : 'إضافة شركة تأمين جديدة'} icon={Shield} maxWidth={460} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="اسم شركة التأمين" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="warm-input" placeholder="مثال: شركة التأمين الوطنية..." required autoFocus />
        </Field>

        <Field label="حالة الاعتماد">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="warm-select">
            {Object.values(INSURANCE_STATUS).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="رقم هاتف الاتصال / الاعتماد">
          <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} className="warm-input" placeholder="06-xxxxxxx" dir="ltr" style={{ textAlign: 'right' }} />
        </Field>

        <FormActions onCancel={onClose} submitLabel="حفظ بيانات التأمين" />
      </form>
    </Modal>
  );
}

export default function InsuranceTab({ list, onNotify }) {
  return (
    <ManagedListTab
      title="إدارة التأمينات الطبية والشركات المعتمدة"
      description="إدارة شبكات التأمين واعتمادات الشركات"
      addLabel="إضافة شركة تأمين +"
      icon={Shield}
      list={list}
      onNotify={onNotify}
      messages={{
        added: 'تمت إضافة شركة التأمين بنجاح!',
        updated: 'تم تحديث بيانات شركة التأمين بنجاح!',
        deleted: 'تم حذف شركة التأمين بنجاح.',
      }}
      getRow={(item) => ({
        title: item.name,
        subtitle: `رقم الاتصال: ${ltr(item.contact)}`,
        side: <StatusBadge tone={STATUS_TONE[item.status] ?? 'neutral'}>{item.status}</StatusBadge>,
      })}
      renderModal={(props) => <InsuranceModal {...props} />}
    />
  );
}
