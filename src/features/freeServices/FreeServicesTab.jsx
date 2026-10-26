import { useState } from 'react';
import { Gift } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { COLORS } from '../../styles';
import ManagedListTab from '../../components/common/ManagedListTab';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import StatusBadge from '../../components/common/StatusBadge';

function FreeServiceModal({ item, onSave, onClose }) {
  const [name, setName] = useState(item?.name ?? '');
  const [dept, setDept] = useState(item?.dept ?? DEPARTMENTS.ENT);
  const [notes, setNotes] = useState(item?.notes ?? '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name: name.trim(), dept, notes: notes.trim() });
  };

  return (
    <Modal title={item ? 'تعديل الخدمة المجانية' : 'إضافة خدمة مجانية جديدة'} icon={Gift} maxWidth={460} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="اسم الخدمة المجانية" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="warm-input" placeholder="مثال: فحص سمع أولي..." required autoFocus />
        </Field>

        <Field label="القسم الطبي" style={{ marginTop: '12px' }}>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="warm-select">
            {Object.values(DEPARTMENTS).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>

        <Field label="ملاحظات أو شروط الاستفادة" optional style={{ marginTop: '12px' }}>
          <textarea className="warm-textarea" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: مرة واحدة لكل مريض جديد" />
        </Field>

        <FormActions onCancel={onClose} submitLabel="حفظ الخدمة" />
      </form>
    </Modal>
  );
}

export default function FreeServicesTab({ list, onNotify }) {
  return (
    <ManagedListTab
      title="قائمة الخدمات المجانية"
      description="الخدمات التي تقدّمها العيادة دون مقابل، مع القسم والشروط"
      addLabel="إضافة خدمة مجانية +"
      icon={Gift}
      list={list}
      onNotify={onNotify}
      messages={{
        added: 'تمت إضافة الخدمة المجانية بنجاح!',
        updated: 'تم تعديل الخدمة المجانية بنجاح!',
        deleted: 'تم حذف الخدمة المجانية.',
      }}
      getRow={(s) => ({
        title: s.name,
        subtitle: (
          <>
            القسم: <strong style={{ color: COLORS.gold }}>{s.dept}</strong>
            {s.notes ? ` • ${s.notes}` : ''}
          </>
        ),
        side: <StatusBadge tone="success">مجانية</StatusBadge>,
      })}
      renderModal={(props) => <FreeServiceModal {...props} />}
    />
  );
}
