import { COLORS } from '../../styles';

const TONES = {
  success: { background: COLORS.successBg, color: COLORS.successText },
  warning: { background: COLORS.warnBg, color: COLORS.warnText },
  neutral: { background: COLORS.neutralBg, color: COLORS.ink },
  danger: { background: COLORS.dangerBg, color: COLORS.dangerText },
};

export default function StatusBadge({ tone = 'neutral', small, children }) {
  return (
    <span
      style={{
        ...TONES[tone],
        padding: small ? '2px 8px' : '4px 12px',
        borderRadius: '20px',
        fontSize: small ? '11px' : '12px',
        fontWeight: '700',
      }}
    >
      {children}
    </span>
  );
}
