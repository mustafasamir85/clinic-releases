import { useState } from 'react';
import { CollapseChevron } from './layout';
import { COLORS, labelLgStyle, labelStyle } from '../../styles';

// تسمية + حقل. required يضيف نجمة حمراء، optional يضيف (اختياري).
export default function Field({ label, required, optional, large, collapsible, style, children }) {
  const [open, setOpen] = useState(true);
  if (collapsible) {
    return (
      <div style={style}>
        <div className="panel-head" style={{ marginBottom: open ? '6px' : '12px' }}>
          <CollapseChevron open={open} onClick={() => setOpen((o) => !o)} label={open ? 'طي القسم' : 'فتح القسم'} />
          <label style={{ ...(large ? labelLgStyle : labelStyle), flex: 1 }}>
            {label}
            {required && <span style={{ color: COLORS.danger }}> *</span>}
            {optional && <span style={{ color: COLORS.faint, fontWeight: 'normal' }}> (اختياري)</span>}
          </label>
        </div>
        <div className="section-collapse-body" hidden={!open}>{children}</div>
      </div>
    );
  }
  return (
    <div style={style}>
      <label style={large ? labelLgStyle : labelStyle}>
        {label}
        {required && <span style={{ color: COLORS.danger }}> *</span>}
        {optional && <span style={{ color: COLORS.faint, fontWeight: 'normal' }}> (اختياري)</span>}
      </label>
      {children}
    </div>
  );
}
