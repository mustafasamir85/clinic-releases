import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { COLORS } from '../../styles';
import { formatDateDMY, formatMoney } from '../../utils/format';
import { Panel, IconBadge, ListRow, SectionHeader, TabCard } from '../../components/common/layout';
import PurchaseModal from './PurchaseModal';

export default function PurchasesTab({ supplies, suppliers, inventory, onNotify }) {
  const [open, setOpen] = useState(false);

  const handleSubmit = (data) => {
    const purchase = inventory.receivePurchase(data);
    setOpen(false);
    onNotify(`تم تسجيل المشتريات (${purchase.no}) وإضافتها للمخزون بنجاح!`, 4000);
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
                subtitle={`📅 ${formatDateDMY(p.date)} • ${p.items.map((i) => `${i.name} ×${i.qty}`).join('، ')}${p.notes ? ` • ${p.notes}` : ''}`}
              >
                <strong style={{ fontSize: '15px', color: COLORS.ink }}>{formatMoney(p.total)}</strong>
              </ListRow>
            ))}
          </div>

          <div style={{ marginTop: '16px', textAlign: 'left', fontWeight: '800', color: COLORS.muted, fontSize: '13px' }}>
            إجمالي المشتريات المسجلة: <span style={{ color: COLORS.gold }}>{formatMoney(Math.round(totalAll * 100) / 100)}</span>
          </div>
        </>
      )}
      </Panel>

      {open && <PurchaseModal supplies={supplies.items} suppliers={suppliers} onSubmit={handleSubmit} onClose={() => setOpen(false)} />}
    </TabCard>
  );
}
