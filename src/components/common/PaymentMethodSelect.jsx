import { Banknote, CreditCard } from 'lucide-react';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '../../constants';
import { COLORS } from '../../styles';

const ICONS = { [PAYMENT_METHODS.CASH]: Banknote, [PAYMENT_METHODS.CARD]: CreditCard };

// اختيار طريقة الدفع (نقدي / بطاقة بنكية) كأزرار تبديل. value/onChange = قيمة من PAYMENT_METHODS.
export default function PaymentMethodSelect({ value, onChange, label = 'طريقة الدفع', style }) {
  return (
    <div style={style} role="radiogroup" aria-label={label}>
      <span style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.text, marginBottom: '6px' }}>{label}</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        {Object.values(PAYMENT_METHODS).map((method) => {
          const Icon = ICONS[method];
          const active = value === method;
          return (
            <button
              key={method}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(method)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                border: `1.5px solid ${active ? COLORS.gold : COLORS.border}`,
                background: active ? COLORS.soft : COLORS.card,
                color: active ? COLORS.gold : COLORS.text,
              }}
            >
              <Icon size={16} /> {PAYMENT_METHOD_LABELS[method]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
