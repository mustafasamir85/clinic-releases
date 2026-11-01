import { Home, LogOut, Menu, Moon, Search, ShieldCheck, Sun } from 'lucide-react';
import { roleLabel } from '../../auth/permissions';
import { CLINIC_NAME, CLINIC_NAME_ENGLISH, CLINIC_SUBTITLE } from '../../constants';
import { COLORS } from '../../styles';
import clinicLogo from '../../assets/logo.jpeg';
import { ltr } from '../../utils/phone';
import ThemeColors from './ThemeColors';
import SyncIndicator from '../common/SyncIndicator';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

export default function Header({ theme, onToggleTheme, themeCtl, user, onLogout, onOpenSearch, onGoHome, onOpenNav, navOpen, display, onDisplayChange }) {
  const isDark = theme === 'dark';

  return (
    <header className="warm-header">
      <div className="warm-header-brand">
        {onOpenNav && (
          <button type="button" className="btn-icon-theme nav-menu-btn" onClick={onOpenNav} aria-label="فتح القائمة" aria-expanded={Boolean(navOpen)} aria-controls="app-nav">
            <Menu size={20} />
          </button>
        )}
        <img className="warm-header-logo" src={clinicLogo} alt={`شعار ${CLINIC_NAME}`} />
        <div className="warm-header-title">
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{CLINIC_NAME}</h1>
          <p lang="en" style={{ margin: 0, fontSize: '18px', fontWeight: '700', direction: 'ltr', textAlign: 'center', display: 'block' }}>{CLINIC_NAME_ENGLISH}</p>
          <span style={{ fontSize: '14px', color: COLORS.muted , direction: 'ltr', textAlign: 'center', display:'block'}}>{CLINIC_SUBTITLE}</span>
        </div>
      </div>

      <div className="warm-header-actions">
        <SyncIndicator />

        {onGoHome && (
          <button type="button" className="btn-icon-theme" onClick={onGoHome} aria-label="الصفحة الرئيسية" title="الصفحة الرئيسية">
            <Home size={18} />
          </button>
        )}

        {onOpenSearch && (
          <button type="button" className="header-search-btn" onClick={onOpenSearch} aria-label="بحث شامل" title={`بحث شامل (${IS_MAC ? '⌘K' : 'Ctrl+K'})`}>
            <Search size={17} />
            <span className="header-search-label">بحث</span>
            <kbd className="header-search-kbd">{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
        )}

        {themeCtl && <ThemeColors ctl={themeCtl} display={display} onDisplayChange={onDisplayChange} />}

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
