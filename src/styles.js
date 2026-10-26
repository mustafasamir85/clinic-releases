// ألوان وأنماط مشتركة (بدل تكرار القيم داخل كل مكوّن)
// كل لون يشير لمتغيّر CSS معرّف في App.css (فاتح + داكن)، فتتبدّل الألوان كلها بتغيير data-theme
export const COLORS = {
  gold: 'var(--c-accent)',          // لون التمييز الرئيسي (اسمه قديم، قيمته الآن تيل)
  ink: 'var(--c-ink)',
  text: 'var(--c-text)',
  muted: 'var(--c-muted)',
  faint: 'var(--c-faint)',
  border: 'var(--c-border)',
  soft: 'var(--c-soft)',
  card: 'var(--c-inset)',           // صناديق وصفوف غائرة داخل البطاقات (الحقول والقوائم)
  white: 'var(--c-surface)',        // خلفية العناصر فوق البطاقات
  primary: 'var(--c-primary)',      // خلفيات داكنة بنص أبيض (شارات، رأس جدول، إشعار)
  onPrimary: 'var(--c-on-primary)',
  danger: 'var(--c-danger)',
  dangerBg: 'var(--c-danger-bg)',
  dangerText: 'var(--c-danger-text)',
  link: 'var(--c-link)',
  success: 'var(--c-success)',      // أخضر صلب بنص أبيض (أزرار)
  successBg: 'var(--c-success-bg)',
  successText: 'var(--c-success-text)',
  warnBg: 'var(--c-warn-bg)',
  warnText: 'var(--c-warn-text)',
  neutralBg: 'var(--c-neutral-bg)',
};

export const labelStyle = { fontSize: '12px', fontWeight: '700', color: COLORS.text };
export const labelLgStyle = { fontSize: '13px', fontWeight: '700', color: COLORS.text };

export const cancelButtonStyle = {
  background: 'transparent',
  border: `1px solid ${COLORS.border}`,
  color: COLORS.muted,
  padding: '12px 20px',
  borderRadius: '12px',
  cursor: 'pointer',
  fontWeight: '700',
};

export const outlineGoldButtonStyle = {
  background: COLORS.soft,
  color: COLORS.ink,
  border: `1px solid ${COLORS.gold}`,
  padding: '8px 16px',
  borderRadius: '12px',
  fontSize: '13px',
  fontWeight: '800',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

export const smallOutlineButtonStyle = {
  background: COLORS.soft,
  color: COLORS.ink,
  border: `1px solid ${COLORS.gold}`,
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

export const iconButtonStyle = (color) => ({
  background: 'transparent',
  border: 'none',
  color,
  cursor: 'pointer',
});

export const twoColumns = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };
