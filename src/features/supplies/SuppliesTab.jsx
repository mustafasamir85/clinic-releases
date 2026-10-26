import { useState } from 'react';
import { ClipboardCheck, FileText, History, Package, PackagePlus } from 'lucide-react';
import { LOW_STOCK_THRESHOLD, SUPPLY_UNITS } from '../../constants';
import { COLORS, outlineGoldButtonStyle, twoColumns } from '../../styles';
import { formatMoney } from '../../utils/format';
import ManagedListTab from '../../components/common/ManagedListTab';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';
import StatusBadge from '../../components/common/StatusBadge';
import StockCountModal from './StockCountModal';
import MovementsModal from './MovementsModal';
import ItemStatementModal from './ItemStatementModal';

// مخزون السماعات الطبية (الكمية لكل موديل) مع زر إدخال سماعات جديدة
function HearingAidsStock({ aids, onReceive }) {
  const total = aids.reduce((t, a) => t + (a.stock ?? 0), 0);
  return (
    <div style={{ maxWidth: 1500, margin: '24px auto 0', background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <strong style={{ color: COLORS.ink, fontSize: '16px' }}>🎧 مخزون السماعات الطبية ({total} سماعة)</strong>
        {onReceive && (
          <button type="button" onClick={onReceive} style={outlineGoldButtonStyle}>
            <PackagePlus size={16} color={COLORS.gold} /> إدخال سماعات للمخزون
          </button>
        )}
      </div>
      {aids.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.faint, padding: '12px' }}>لا توجد سماعات مسجلة. أدخل سماعات لإنشاء موديلات ومخزونها.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {aids.map((a) => {
            const stock = a.stock ?? 0;
            return (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px 14px' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: COLORS.ink }}>{a.brand} {a.model}</strong>
                  <span style={{ fontSize: '11px', color: COLORS.gold, background: COLORS.soft, padding: '2px 8px', borderRadius: '6px', marginRight: '8px', fontWeight: '700' }}>{a.type}</span>
                  <span style={{ display: 'block', fontSize: '12px', color: COLORS.muted }}>
                    السعر: {formatMoney(a.price)}{a.cost !== undefined && <> • آخر تكلفة: {formatMoney(a.cost)}</>}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ color: stock === 0 ? COLORS.danger : COLORS.successText }}>{stock} قطعة</strong>
                  <StatusBadge tone={stock === 0 ? 'danger' : stock < 3 ? 'warning' : 'success'}>{stock === 0 ? 'نفد' : stock < 3 ? 'منخفض' : 'متوفر'}</StatusBadge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupplyModal({ item, onSave, onClose }) {
  const [name, setName] = useState(item?.name ?? '');
  const [stock, setStock] = useState(item ? String(item.stock) : '');
  const [unit, setUnit] = useState(item?.unit ?? SUPPLY_UNITS[0]);
  const [price, setPrice] = useState(item ? String(item.price) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    // الكمية لا تُعدَّل من هنا للأصناف الموجودة (تُعدَّل بالمشتريات أو الجرد ليبقى لها سجل)
    onSave({ name: name.trim(), ...(item ? {} : { stock: Number(stock) }), unit, price: Number(price) });
  };

  return (
    <Modal title={item ? 'تعديل المستلزم الطبي' : 'إضافة مستلزم طبي جديد'} icon={Package} maxWidth={480} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="اسم المستلزم الطبي / الصنف" required>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="warm-input" placeholder="مثال: بطاريات سماعات حجم 312..." required autoFocus />
        </Field>

        <div style={twoColumns}>
          <Field label={item ? 'الكمية في المخزون (عبر المشتريات أو الجرد)' : 'الرصيد الافتتاحي'} required={!item}>
            <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="warm-input" placeholder="مثال: 50" required={!item} disabled={Boolean(item)} />
          </Field>
          <Field label="وحدة القياس">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className="warm-select">
              {SUPPLY_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="سعر التجزئة / الوحدة (د.أ)" required>
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="warm-input" placeholder="مثال: 5" required />
        </Field>

        <FormActions onCancel={onClose} submitLabel="حفظ المستلزم" />
      </form>
    </Modal>
  );
}

export default function SuppliesTab({ list, inventory, hearingAids = [], onReceiveAids, onNotify }) {
  const [view, setView] = useState(null); // 'count' | 'movements' | 'statement' | null

  const handleApplyCount = (counts, reason) => {
    const n = inventory.applyCount(counts, reason);
    setView(null);
    onNotify(`تم اعتماد الجرد وتعديل ${n} صنف بنجاح!`, 4000);
  };

  return (
    <>
    <ManagedListTab
      extraActions={
        <>
          <button onClick={() => setView('movements')} style={outlineGoldButtonStyle}>
            <History size={16} color={COLORS.gold} /> سجل الحركة
          </button>
          <button onClick={() => setView('statement')} style={outlineGoldButtonStyle}>
            <FileText size={16} color={COLORS.gold} /> كشف حركة مادة
          </button>
          <button onClick={() => setView('count')} style={outlineGoldButtonStyle}>
            <ClipboardCheck size={16} color={COLORS.gold} /> جرد المخزون
          </button>
        </>
      }
      title="المستلزمات الطبية والمخزون"
      description="إدارة المخزون، المستهلكات، البطاريات، وأدوات العيادة"
      addLabel="إضافة مستلزم جديد +"
      icon={Package}
      list={list}
      onNotify={onNotify}
      messages={{
        added: 'تمت إضافة المستلزم الطبي للمخزون بنجاح!',
        updated: 'تم تحديث المستلزم الطبي بنجاح!',
        deleted: 'تم حذف المستلزم الطبي بنجاح.',
      }}
      getRow={(item) => {
        const low = item.stock < LOW_STOCK_THRESHOLD;
        return {
          title: item.name,
          subtitle: (
            <>
              المخزون المتوفر:{' '}
              <strong style={{ color: low ? COLORS.danger : COLORS.successText }}>{item.stock} {item.unit}</strong>
              {' '}• السعر: {formatMoney(item.price)}
              {item.cost !== undefined && <> • آخر تكلفة شراء: {formatMoney(item.cost)}</>}
            </>
          ),
          side: <StatusBadge tone={low ? 'warning' : 'success'}>{low ? 'مخزون منخفض' : 'متوفر'}</StatusBadge>,
        };
      }}
      renderModal={(props) => <SupplyModal {...props} />}
    />

    <HearingAidsStock aids={hearingAids} onReceive={onReceiveAids} />

    {view === 'count' && <StockCountModal items={list.items} onApply={handleApplyCount} onClose={() => setView(null)} />}
    {view === 'movements' && <MovementsModal movements={inventory.movements} onClose={() => setView(null)} />}
    {view === 'statement' && <ItemStatementModal supplies={list.items} hearingAids={hearingAids} movements={inventory.movements} onClose={() => setView(null)} />}
    </>
  );
}
