import { useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { HEARING_AID_TYPES } from '../../constants';
import { COLORS, twoColumns } from '../../styles';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';

const NEW_MODEL = '__new__';
const EMPTY_NEW = { brand: '', model: '', type: HEARING_AID_TYPES[0], price: '' };

// إدخال سماعات إلى المخزون مع تسجيل فاتورة شراء مرتبطة بمورد.
// onSubmit({ aidId | newAid, qty, unitCost, supplierId, serials, notes }) تعيد { name, qty }.
export default function HearingAidStockModal({ aids, suppliers, onSubmit, onClose }) {
  const [aidId, setAidId] = useState(aids[0] ? String(aids[0].id) : NEW_MODEL);
  const [newAid, setNewAid] = useState(EMPTY_NEW);
  const [qty, setQty] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [serials, setSerials] = useState('');
  const [notes, setNotes] = useState('');

  const isNew = aidId === NEW_MODEL;
  const setNew = (key) => (e) => setNewAid((a) => ({ ...a, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...(isNew ? { newAid } : { aidId }),
      qty: Math.floor(Number(qty)),
      unitCost,
      supplierId,
      serials: serials.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <Modal title="إدخال سماعات إلى المخزون" icon={PackagePlus} maxWidth={560} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="الموديل" required>
          <select className="warm-select" value={aidId} onChange={(e) => setAidId(e.target.value)}>
            {aids.map((a) => (
              <option key={a.id} value={a.id}>
                {a.brand} {a.model} ({a.type}) — المخزون الحالي: {a.stock ?? 0}
              </option>
            ))}
            <option value={NEW_MODEL}>+ موديل جديد غير مسجَّل</option>
          </select>
        </Field>

        {isNew && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
            <div style={twoColumns}>
              <Field label="الماركة" required>
                <input type="text" className="warm-input" value={newAid.brand} onChange={setNew('brand')} placeholder="Phonak" required />
              </Field>
              <Field label="الموديل" required>
                <input type="text" className="warm-input" value={newAid.model} onChange={setNew('model')} placeholder="Audéo Lumity 50" required />
              </Field>
            </div>
            <div style={twoColumns}>
              <Field label="النوع">
                <select className="warm-select" value={newAid.type} onChange={setNew('type')}>
                  {HEARING_AID_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="سعر البيع (د.أ)" required>
                <input type="number" min="0" step="0.01" className="warm-input" value={newAid.price} onChange={setNew('price')} required />
              </Field>
            </div>
          </div>
        )}

        <div style={twoColumns}>
          <Field label="الكمية المُدخَلة" required>
            <input type="number" min="1" step="1" className="warm-input" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="مثال: 5" required />
          </Field>
          <Field label="تكلفة الوحدة (د.أ)" optional>
            <input type="number" min="0" step="0.01" className="warm-input" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          </Field>
        </div>

        <Field label="المورد" required>
          <select className="warm-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">{suppliers.length ? 'اختر المورد...' : 'أضف مورداً من تبويب الموردين أولاً'}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label="الأرقام التسلسلية" optional>
          <textarea className="warm-textarea" rows="2" value={serials} onChange={(e) => setSerials(e.target.value)} placeholder="تُحفظ في سجل الحركة (افصل بينها بفاصلة)" />
        </Field>

        <Field label="ملاحظات" optional>
          <input type="text" className="warm-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <FormActions onCancel={onClose} submitLabel="إدخال للمخزون" />
      </form>
    </Modal>
  );
}
