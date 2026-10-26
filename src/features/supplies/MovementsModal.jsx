import { History } from 'lucide-react';
import { COLORS } from '../../styles';
import { MOVEMENT_LABELS } from '../../hooks/useInventory';
import { formatDateDMY, formatUser } from '../../utils/format';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';

const TONE = { purchase: 'success', adjustment: 'warning', usage: 'neutral', return: 'success', sale: 'neutral', receipt: 'success', removal: 'danger' };

// سجل حركة المخزون: الشراء والجرد والاستهلاك والبيع وإدخال السماعات (الأحدث أولاً)
export default function MovementsModal({ movements, onClose }) {
  return (
    <Modal title="سجل حركة المخزون" icon={History} maxWidth={680} onClose={onClose}>
      {movements.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.faint, padding: '20px' }}>لا توجد حركات مسجلة بعد.</p>
      ) : (
        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {movements.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px 14px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: COLORS.ink }}>{m.supply_name}</strong>
                <span style={{ display: 'block', fontSize: '11px', color: COLORS.muted }}>
                  {formatDateDMY(m.date)}{m.note ? ` • ${m.note}` : ''}{m.by ? ` • 👤 ${formatUser(m.by, m.by_username)}` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StatusBadge small tone={TONE[m.type] ?? 'neutral'}>{MOVEMENT_LABELS[m.type] ?? m.type}</StatusBadge>
                <strong style={{ minWidth: '44px', textAlign: 'left', color: m.qty > 0 ? COLORS.successText : COLORS.danger }}>
                  {m.qty > 0 ? `+${m.qty}` : m.qty}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
