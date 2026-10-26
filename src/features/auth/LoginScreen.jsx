import { useState } from 'react';
import { Activity, Eye, EyeOff, KeyRound, LogIn, Moon, Sun, User } from 'lucide-react';
import { CLINIC_NAME, CLINIC_SUBTITLE } from '../../constants';
import { COLORS } from '../../styles';
import Field from '../../components/common/Field';

// غلاف مشترك لشاشات الدخول وتغيير كلمة المرور (بطاقة في وسط الصفحة)
export function AuthShell({ title, subtitle, theme, onToggleTheme, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
      {onToggleTheme && (
        <button type="button" className="btn-icon-theme" onClick={onToggleTheme} aria-label="تبديل المظهر" style={{ position: 'absolute', top: '20px', left: '20px' }}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      )}

      <div className="warm-card" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, var(--c-btn-1), var(--c-btn-2))', color: '#fff', padding: '14px', borderRadius: '18px', marginBottom: '14px' }}>
            <Activity size={30} />
          </div>
          <h1 style={{ margin: 0, fontSize: '19px', fontWeight: '800' }}>{CLINIC_NAME}</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: COLORS.muted }}>{CLINIC_SUBTITLE}</p>
        </div>

        <h2 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: '800' }}>{title}</h2>
        {subtitle && <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: COLORS.muted }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

// حقل كلمة مرور مع زر إظهار/إخفاء
export function PasswordInput({ value, onChange, placeholder, autoComplete, autoFocus }) {
  const [shown, setShown] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={shown ? 'text' : 'password'}
        className="warm-input"
        style={{ margin: 0, paddingLeft: '44px' }}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: COLORS.muted, display: 'flex' }}
      >
        {shown ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export const authErrorStyle = { color: COLORS.danger, fontSize: '13px', fontWeight: '700', margin: '12px 0 0 0' };

export default function LoginScreen({ onLogin, theme, onToggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onLogin(username, password);
    if (!result.ok) {
      setError(result.error);
      setPassword('');
    }
  };

  return (
    <AuthShell title="تسجيل الدخول" subtitle="أدخل بيانات حسابك للمتابعة" theme={theme} onToggleTheme={onToggleTheme}>
      <form onSubmit={handleSubmit}>
        <Field label={<><User size={13} style={{ verticalAlign: '-2px' }} /> اسم المستخدم</>}>
          <input type="text" className="warm-input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </Field>

        <Field label={<><KeyRound size={13} style={{ verticalAlign: '-2px' }} /> كلمة المرور</>} style={{ marginTop: '12px' }}>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>

        {error && <p style={authErrorStyle} role="alert">{error}</p>}

        <button type="submit" className="btn-warm-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}>
          <LogIn size={16} /> دخول
        </button>
      </form>
    </AuthShell>
  );
}
