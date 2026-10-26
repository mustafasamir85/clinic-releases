import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { COLORS, twoColumns } from '../../styles';
import { formatMoney } from '../../utils/format';
import ManagedListTab from '../../components/common/ManagedListTab';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';

function ServiceModal({ item, onSave, onClose }) {
  const [name, setName] = useState(item?.name ?? '');
  const [dept, setDept] = useState(item?.dept ?? DEPARTMENTS.ENT);
  const [price, setPrice] = useState(item ? String(item.price) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name: name.trim(), dept, price: Number(price) });
  };

  return (
    <Modal title={item ? 'تعديل الخدمة الطبية' : 'إضافة خدمة طبية جديدة'} icon={Briefcase} maxWidth={460} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="اسم الخدمة أو الإجراء الطبي" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="warm-input" placeholder="مثال: كشفية عيادة الأنف والأذن..." required autoFocus />
        </Field>

        <div style={twoColumns}>
          <Field label="القسم الطبي">
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="warm-select">
              {Object.values(DEPARTMENTS).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="السعر (د.أ)" required>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="warm-input" placeholder="مثال: 25" required />
          </Field>
        </div>

        <FormActions onCancel={onClose} submitLabel="حفظ الخدمة" />
      </form>
    </Modal>
  );
}

export default function ServicesTab({ list, onNotify }) {
  return (
    <ManagedListTab
      title="الإجراءات والخدمات الطبية"
      description="إدارة الكشفيات، العمليات، الفحوصات، وأسعار الخدمات"
      addLabel="إضافة خدمة جديدة +"
      icon={Briefcase}
      list={list}
      onNotify={onNotify}
      messages={{
        added: 'تمت إضافة الخدمة والإجراء الطبي بنجاح!',
        updated: 'تم تعديل الخدمة والإجراء الطبي بنجاح!',
        deleted: 'تم حذف الخدمة الطبية بنجاح.',
      }}
      getRow={(serv) => ({
        title: serv.name,
        subtitle: (
          <>القسم: <strong style={{ color: COLORS.gold }}>{serv.dept}</strong></>
        ),
        side: (
          <strong style={{ fontSize: '15px', color: COLORS.successText, background: COLORS.successBg, padding: '4px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
            {formatMoney(serv.price)}
          </strong>
        ),
      })}
      renderModal={(props) => <ServiceModal {...props} />}
    />
  );
}
