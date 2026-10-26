import { ltr } from '../../utils/phone';
import { useState } from 'react';
import { Truck } from 'lucide-react';
import { COLORS, twoColumns } from '../../styles';
import { formatMoney } from '../../utils/format';
import ManagedListTab from '../../components/common/ManagedListTab';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';

function SupplierModal({ item, onSave, onClose }) {
  const [name, setName] = useState(item?.name ?? '');
  const [contact, setContact] = useState(item?.contact ?? '');
  const [phone, setPhone] = useState(item?.phone ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name: name.trim(), contact: contact.trim(), phone: phone.trim(), notes: notes.trim() });
  };

  return (
    <Modal title={item ? 'تعديل بيانات المورّد' : 'إضافة مورّد جديد'} icon={Truck} maxWidth={480} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="اسم المورّد / الشركة" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="warm-input" placeholder="مثال: شركة الأفق للمستلزمات الطبية" required autoFocus />
        </Field>

        <div style={twoColumns}>
          <Field label="الشخص المسؤول" optional>
            <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} className="warm-input" placeholder="اسم مندوب المبيعات" />
          </Field>
          <Field label="رقم الهاتف" required>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="warm-input" placeholder="07xxxxxxxx" required dir="ltr" style={{ textAlign: 'right' }} />
          </Field>
        </div>

        <Field label="ملاحظات" optional>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="warm-input" placeholder="شروط الدفع، أيام التوصيل..." />
        </Field>

        <FormActions onCancel={onClose} submitLabel="حفظ المورّد" />
      </form>
    </Modal>
  );
}

export default function SuppliersTab({ list, purchases, onNotify }) {
  // عدد وإجمالي مشتريات كل مورّد (محسوبة من فواتير الشراء المسجلة)
  const statsOf = (supplierId) => {
    const mine = purchases.filter((p) => p.supplier_id === supplierId);
    return { count: mine.length, total: mine.reduce((sum, p) => sum + p.total, 0) };
  };

  return (
    <ManagedListTab
      title="الموردين"
      description="إدارة بيانات الموردين، وتُختار منهم جهة الشراء عند تسجيل المشتريات"
      addLabel="إضافة مورّد +"
      icon={Truck}
      list={list}
      onNotify={onNotify}
      messages={{
        added: 'تمت إضافة المورّد بنجاح!',
        updated: 'تم تحديث بيانات المورّد بنجاح!',
        deleted: 'تم حذف المورّد بنجاح.',
      }}
      getRow={(s) => {
        const { count, total } = statsOf(s.id);
        const parts = [s.contact && `👤 ${s.contact}`, `📞 ${ltr(s.phone)}`, s.notes].filter(Boolean);
        return {
          title: s.name,
          subtitle: parts.join(' • '),
          side: (
            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '14px', color: COLORS.ink, display: 'block' }}>{formatMoney(Math.round(total * 100) / 100)}</strong>
              <span style={{ fontSize: '12px', color: COLORS.muted }}>{count} فاتورة شراء</span>
            </div>
          ),
        };
      }}
      renderModal={(props) => <SupplierModal {...props} />}
    />
  );
}
