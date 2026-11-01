import { useState } from 'react';
import { PackagePlus, Plus, Trash2 } from 'lucide-react';
import { HEARING_AID_TYPES } from '../../constants';
import { COLORS, twoColumns, outlineGoldButtonStyle } from '../../styles';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import { newId } from '../../utils/id';

const NEW_MODEL = '__new__';
const EMPTY_NEW = { brand: '', model: '', type: HEARING_AID_TYPES[0], price: '' };

// بند واحد: موديل (موجود أو جديد) + كمية + تكلفة + أرقام تسلسلية
const makeLine = (aids) => ({
  key: newId(),
  aidId: aids[0] ? String(aids[0].id) : NEW_MODEL,
  newAid: { ...EMPTY_NEW },
  qty: '',
  unitCost: '',
  serials: '',
});

// إدخال سماعات (بند واحد أو عدة بنود) إلى المخزون مع تسجيل فاتورة شراء واحدة مرتبطة بمورد.
// onSubmit({ items: [{ aidId | newAid, qty, unitCost, serials }], supplierId, notes }) تعيد { name, qty, purchase, lines }.
export default function HearingAidStockModal({ aids, suppliers, onSubmit, onClose }) {
  const [lines, setLines] = useState(() => [makeLine(aids)]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');

  const patchLine = (key, changes) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  const patchNew = (key, field, value) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, newAid: { ...l.newAid, [field]: value } } : l)));
  const addLine = () => setLines((ls) => [...ls, makeLine(aids)]);
  const removeLine = (key) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));

  const totalQty = lines.reduce((t, l) => t + (Math.floor(Number(l.qty)) || 0), 0);
  const totalCost = lines.reduce((t, l) => t + (Math.floor(Number(l.qty)) || 0) * (Number(l.unitCost) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      items: lines.map((l) => ({
        ...(l.aidId === NEW_MODEL ? { newAid: l.newAid } : { aidId: l.aidId }),
        qty: Math.floor(Number(l.qty)),
        unitCost: l.unitCost,
        serials: l.serials.trim(),
      })),
      supplierId,
      notes: notes.trim(),
    });
  };

  return (
    <Modal warnUnsaved title="إدخال سماعات إلى المخزون" icon={PackagePlus} maxWidth={680} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="المورد" required>
          <select className="warm-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">{suppliers.length ? 'اختر المورد...' : 'أضف مورداً من تبويب الموردين أولاً'}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        {lines.map((line, index) => {
          const isNew = line.aidId === NEW_MODEL;
          return (
            <div key={line.key} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '13px', color: COLORS.ink }}>البند {index + 1}</strong>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    aria-label={`حذف البند ${index + 1}`}
                    title="حذف البند"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: COLORS.danger, cursor: 'pointer', fontSize: '12px' }}
                  >
                    <Trash2 size={15} /> حذف
                  </button>
                )}
              </div>

              <Field label="الموديل" required>
                <select className="warm-select" value={line.aidId} onChange={(e) => patchLine(line.key, { aidId: e.target.value })}>
                  {aids.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.brand} {a.model} ({a.type}) — المخزون الحالي: {a.stock ?? 0}
                    </option>
                  ))}
                  <option value={NEW_MODEL}>+ موديل جديد غير مسجَّل</option>
                </select>
              </Field>

              {isNew && (
                <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: '10px', padding: '10px', marginBottom: '12px' }}>
                  <div style={twoColumns}>
                    <Field label="الماركة" required>
                      <input type="text" className="warm-input" value={line.newAid.brand} onChange={(e) => patchNew(line.key, 'brand', e.target.value)} placeholder="Phonak" required />
                    </Field>
                    <Field label="الموديل" required>
                      <input type="text" className="warm-input" value={line.newAid.model} onChange={(e) => patchNew(line.key, 'model', e.target.value)} placeholder="Audéo Lumity 50" required />
                    </Field>
                  </div>
                  <div style={twoColumns}>
                    <Field label="النوع">
                      <select className="warm-select" value={line.newAid.type} onChange={(e) => patchNew(line.key, 'type', e.target.value)}>
                        {HEARING_AID_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="سعر البيع (د.أ)" required>
                      <input type="number" min="0" step="0.01" className="warm-input" value={line.newAid.price} onChange={(e) => patchNew(line.key, 'price', e.target.value)} required />
                    </Field>
                  </div>
                </div>
              )}

              <div style={twoColumns}>
                <Field label="الكمية المُدخَلة" required>
                  <input type="number" min="1" step="1" className="warm-input" value={line.qty} onChange={(e) => patchLine(line.key, { qty: e.target.value })} placeholder="مثال: 5" required />
                </Field>
                <Field label="تكلفة الوحدة (د.أ)" optional>
                  <input type="number" min="0" step="0.01" className="warm-input" value={line.unitCost} onChange={(e) => patchLine(line.key, { unitCost: e.target.value })} />
                </Field>
              </div>

              <Field label="الأرقام التسلسلية" optional>
                <textarea className="warm-textarea" rows="2" value={line.serials} onChange={(e) => patchLine(line.key, { serials: e.target.value })} placeholder="تُحفظ في سجل الحركة (افصل بينها بفاصلة)" />
              </Field>
            </div>
          );
        })}

        <button type="button" onClick={addLine} style={{ ...outlineGoldButtonStyle, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
          <Plus size={16} /> إضافة بند آخر
        </button>

        <Field label="ملاحظات" optional>
          <input type="text" className="warm-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: '700', color: COLORS.ink }}>
          {lines.length} {lines.length === 1 ? 'بند' : 'بنود'} • إجمالي القطع: {totalQty}{totalCost > 0 ? ` • إجمالي التكلفة: ${Math.round(totalCost * 100) / 100} د.أ` : ''}
        </p>

        <FormActions onCancel={onClose} submitLabel="إدخال للمخزون" />
      </form>
    </Modal>
  );
}
