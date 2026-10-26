import { cancelButtonStyle } from '../../styles';

export default function FormActions({ onCancel, submitLabel, submitIcon: Icon, disabled }) {
  return (
    <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
      <button type="button" onClick={onCancel} style={cancelButtonStyle}>
        إلغاء
      </button>
      <button type="submit" className="btn-warm-primary" disabled={disabled}>
        {Icon && <Icon size={16} />} {submitLabel}
      </button>
    </div>
  );
}
