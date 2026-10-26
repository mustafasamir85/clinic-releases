import { Check } from 'lucide-react';
import { COLORS } from '../../styles';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: COLORS.primary,
        color: COLORS.onPrimary,
        padding: '14px 28px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
        border: `1px solid ${COLORS.gold}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 1000,
        fontWeight: '700',
        fontSize: '15px',
      }}
    >
      <div style={{ background: COLORS.gold, borderRadius: '50%', padding: '4px', display: 'flex' }}>
        <Check size={16} color="var(--c-primary)" strokeWidth={3} />
      </div>
      <span>{message}</span>
    </div>
  );
}
