import { useState } from 'react';
import { Pencil, ShoppingCart, Trash2 } from 'lucide-react';
import { COLORS, iconButtonStyle } from '../../styles';
import { formatDateDMY, formatMoney } from '../../utils/format';
import { Panel, IconBadge, ListRow, SectionHeader, TabCard } from '../../components/common/layout';
import PurchaseModal from './PurchaseModal';
import { useConfirm } from '../../components/common/ConfirmDialog';

export default function PurchasesTab({ supplies, hearingAids = [], suppliers, inventory, canEdit = false, canDelete = false, onNotify }) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const editing = editingId ? inventory.purchases.find((p) => p.id === editingId) : null;

  const handleSubmit = (data) => {
    let purchase;
    try {
      purchase = inventory.receivePurchase(data);
    } catch (error) {
      onNotify(error.message || 'تعذر تسجيل المشتريات.', { type: 'error', duration: 4000 });
      return;
    }
    setOpen(false);
    onNotify(`تم تسجيل المشتريات (${purchase.no}) وإضافتها للمخزون بنجاح!`, 4000);
  };

  const handleEdit = (data) => {
    let updated;
    try {
      updated = inventory.updatePurchase(editingId, data);
    } catch (error) {
      onNotify(error.message || 'تعذر تعديل الفاتورة.', { type: 'error', duration: 4000 });
      return;
    }
    setEditingId(null);
    onNotify(`تم تعديل فاتورة الشراء (${updated.no}) وتحديث المخزون بنجاح!`, 4000);
  };

  const handleDelete = async (p) => {
    const stockNote = 'ستُخصم كميات بنودها من المخزون.';
    if (!(await confirm({ title: 'حذف فاتورة الشراء', message: `حذف فاتورة الشراء ${p.no} (${p.supplier}) بقيمة ${formatMoney(p.total)}؟\n${stockNote}\nلا يمكن التراجع عن الحذف.`, confirmLabel: 'حذف الفاتورة', danger: true }))) return;
    try {
      inventory.deletePurchase(p.id);
    } catch (error) {
      onNotify(error.message || 'تعذر حذف الفاتورة.', { type: 'error', duration: 5000 });
      return;
    }
    if (editingId === p.id) setEditingId(null);
    onNotify(`تم حذف فاتورة الشراء (${p.no}) وخصم كمياتها من المخزون.`, 4000);
  };

  const totalAll = inventory.purchases.reduce((sum, p) => sum + p.total, 0);

  return (
    <TabCard>
      <SectionHeader
        title="المشتريات"
        description="تسجيل مشتريات المستلزمات والسماعات من الموردين، وتُضاف كمياتها للمخزون تلقائياً"
        icon={ShoppingCart}
        action={
          <button onClick={() => setOpen(true)} className="btn-warm-primary">
            <ShoppingCart size={18} /> تسجيل مشتريات +
          </button>
        }
      />

      <Panel title={`قائمة المشتريات (${inventory.purchases.length})`}>
      {inventory.purchases.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.faint, padding: '24px' }}>
          لا توجد مشتريات مسجلة بعد. اضغط «تسجيل مشتريات» لإضافة أول فاتورة شراء.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {inventory.purchases.map((p) => (
              <ListRow
                key={p.id}
                leading={<IconBadge icon={ShoppingCart} />}
                title={`${p.no} • ${p.supplier}`}
                subtitle={`📅 ${formatDateDMY(p.date)} • ${p.items.map((i) => `${i.name} ×${i.qty}`).join('، ')}${p.notes ? ` • ${p.notes}` : ''}${p.edited_at ? ` • ✏️ عُدِّلت${p.edited_by ? ` بواسطة ${p.edited_by}` : ''} (${formatDateDMY(p.edited_at)})` : ''}`}
              >
                <strong style={{ fontSize: '15px', color: COLORS.ink }}>{formatMoney(p.total)}</strong>
                {canEdit && (
                  <button type="button" onClick={() => setEditingId(p.id)} aria-label={`تعديل الفاتورة ${p.no}`} title="تعديل الفاتورة" style={iconButtonStyle(COLORS.gold)}>
                    <Pencil size={16} />
                  </button>
                )}
                {canDelete && (
                  <button type="button" onClick={() => handleDelete(p)} aria-label={`حذف الفاتورة ${p.no}`} title="حذف الفاتورة" style={iconButtonStyle(COLORS.danger)}>
                    <Trash2 size={16} />
                  </button>
                )}
              </ListRow>
            ))}
          </div>

          <div style={{ marginTop: '16px', textAlign: 'left', fontWeight: '800', color: COLORS.muted, fontSize: '13px' }}>
            إجمالي المشتريات المسجلة: <span style={{ color: COLORS.gold }}>{formatMoney(Math.round(totalAll * 100) / 100)}</span>
          </div>
        </>
      )}
      </Panel>

      {editing && (
        <PurchaseModal purchase={editing} supplies={supplies.items} hearingAids={hearingAids} suppliers={suppliers} onSubmit={handleEdit} onClose={() => setEditingId(null)} />
      )}
      {open && <PurchaseModal supplies={supplies.items} hearingAids={hearingAids} suppliers={suppliers} onSubmit={handleSubmit} onClose={() => setOpen(false)} />}
    </TabCard>
  );
}
