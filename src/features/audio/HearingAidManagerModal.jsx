import { useState } from 'react';
import { PackagePlus, Plus, Save, Settings } from 'lucide-react';
import { HEARING_AID_TYPES } from '../../constants';
import { COLORS } from '../../styles';
import { formatMoney } from '../../utils/format';
import Modal from '../../components/common/Modal';
import { EditDeleteActions } from '../../components/common/layout';

const EMPTY_FORM = { brand: '', model: '', type: 'RIC', price: '' };

export default function HearingAidManagerModal({ list, onNotify, onClose, onReceiveStock }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      type: form.type,
      price: Number(form.price),
    };

    if (editingId) {
      list.update(editingId, data);
      onNotify('تم تعديل بيانات وسعر السماعة بنجاح!');
    } else {
      list.add(data);
      onNotify('تمت إضافة السماعة والسعر بنجاح لقاعدة البيانات!');
    }
    resetForm();
  };

  const handleEdit = (aid) => {
    setEditingId(aid.id);
    setForm({ brand: aid.brand, model: aid.model, type: aid.type, price: String(aid.price ?? '') });
  };

  const handleDelete = (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه السماعة؟')) return;
    list.remove(id);
    if (id === editingId) resetForm();
    onNotify('تم حذف السماعة من قاعدة البيانات.');
  };

  return (
    <Modal title="إدارة قاعدة بيانات السماعات الطبية والأسعار" icon={Settings} maxWidth={680} onClose={onClose}>
      {onReceiveStock && (
        <button type="button" onClick={onReceiveStock} className="btn-warm-primary" style={{ marginBottom: '14px', padding: '8px 16px' }}>
          <PackagePlus size={16} /> إدخال سماعات إلى المخزون
        </button>
      )}
      <form
        onSubmit={handleSubmit}
        style={{ background: COLORS.card, padding: '16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, marginBottom: '20px' }}
      >
        <span style={{ fontSize: '13px', fontWeight: '800', color: COLORS.ink, display: 'block', marginBottom: '10px' }}>
          {editingId ? 'تعديل بيانات النموذج والسعر:' : 'إضافة موديل سماعة جديد وسعرها لقاعدة البيانات:'}
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1.5fr auto', gap: '8px' }}>
          <input type="text" placeholder="الماركة (Brand)" value={form.brand} onChange={setField('brand')} className="warm-input" style={{ margin: 0 }} required />
          <input type="text" placeholder="الموديل (Model)" value={form.model} onChange={setField('model')} className="warm-input" style={{ margin: 0 }} required />
          <select value={form.type} onChange={setField('type')} className="warm-select" style={{ margin: 0 }}>
            {HEARING_AID_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input type="number" min="0" step="0.01" placeholder="السعر (د.أ)" value={form.price} onChange={setField('price')} className="warm-input" style={{ margin: 0 }} required />
          <button type="submit" className="btn-warm-primary" style={{ padding: '0 14px' }} aria-label={editingId ? 'حفظ التعديل' : 'إضافة'}>
            {editingId ? <Save size={16} /> : <Plus size={16} />}
          </button>
        </div>

        {editingId && (
          <button type="button" onClick={resetForm} style={{ marginTop: '8px', background: 'transparent', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
            إلغاء التعديل
          </button>
        )}
      </form>

      <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {list.items.map((aid) => (
          <div key={aid.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.white, padding: '10px 16px', borderRadius: '10px', border: `1px solid ${COLORS.border}` }}>
            <div>
              <strong style={{ fontSize: '14px', color: COLORS.ink }}>{aid.brand} {aid.model}</strong>
              <span style={{ fontSize: '11px', color: COLORS.gold, background: COLORS.soft, padding: '2px 8px', borderRadius: '6px', marginRight: '8px', fontWeight: '700' }}>{aid.type}</span>
              <span style={{ fontSize: '12px', color: COLORS.ink, marginRight: '8px', fontWeight: '800' }}>💰 {formatMoney(aid.price)}</span>
              <span style={{ fontSize: '12px', marginRight: '8px', fontWeight: '800', color: (aid.stock ?? 0) === 0 ? COLORS.danger : COLORS.successText }}>📦 المخزون: {aid.stock ?? 0}</span>
            </div>
            <EditDeleteActions onEdit={() => handleEdit(aid)} onDelete={() => handleDelete(aid.id)} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
