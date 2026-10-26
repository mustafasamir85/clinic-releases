import { LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { roleLabel } from '../../auth/permissions';
import { CLINIC_NAME, CLINIC_SUBTITLE } from '../../constants';
import { COLORS } from '../../styles';
import clinicLogo from '../../assets/logo.jpeg';

export default function Header({ theme, onToggleTheme, user, onLogout }) {
  const isDark = theme === 'dark';

  return (
    <header className="warm-header">
      <div className="warm-header-brand">
        <img className="warm-header-logo" src={clinicLogo} alt={`شعار ${CLINIC_NAME}`} />
        <div className="warm-header-title">
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{CLINIC_NAME}</h1>
          <span style={{ fontSize: '12px', color: COLORS.muted }}>{CLINIC_SUBTITLE}</span>
        </div>
      </div>

      <div className="warm-header-actions">
        <button
          type="button"
          className="btn-icon-theme"
          onClick={onToggleTheme}
          aria-label={isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'}
          title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div
          className="warm-header-user"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: COLORS.card,
            color: COLORS.ink,
            padding: '8px 16px',
            borderRadius: '14px',
            border: `1px solid ${COLORS.border}`,
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          <ShieldCheck size={16} color={COLORS.gold} />
          <span className="warm-header-user-name">{user.name}</span>
          <span className="warm-header-user-role" style={{ color: COLORS.muted, fontWeight: '500', fontSize: '12px' }}>• {roleLabel(user.role)}</span>
        </div>

        <button type="button" className="btn-icon-theme" onClick={onLogout} aria-label="تسجيل الخروج" title="تسجيل الخروج">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
