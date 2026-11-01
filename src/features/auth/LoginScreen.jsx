import { useEffect, useState } from 'react';
import { Activity, Eye, EyeOff, KeyRound, LogIn, Moon, Sun, User } from 'lucide-react';
import { CLINIC_NAME, CLINIC_NAME_ENGLISH , CLINIC_SUBTITLE } from '../../constants';
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
          <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, var(--c-btn-1), var(--c-btn-2))', color: 'var(--c-on-btn)', padding: '14px', borderRadius: '18px', marginBottom: '14px' }}>
            <Activity size={30} />
          </div>
          <h1 style={{ margin: 0, fontSize: '19px', fontWeight: '800' }}>{CLINIC_NAME}</h1>
          <h1 style={{ margin: 0, fontSize: '19px', fontWeight: '800' }}>{CLINIC_NAME_ENGLISH}</h1>
          <span style={{ margin: 0, fontSize: '19px' }}>{CLINIC_SUBTITLE}</span>
        </div>

        <h2 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: '800' }}>{title}</h2>
        {subtitle && <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: COLORS.muted }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

// حقل كلمة مرور مع زر إظهار/إخفاء
export function PasswordInput({ value, onChange, placeholder, autoComplete, autoFocus, id, 'aria-describedby': ariaDescribedBy, 'aria-invalid': ariaInvalid }) {
  const [shown, setShown] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
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

// يعلن لـ Field أن هذا المكوّن يقبل id ويضعه على حقل الإدخال
PasswordInput.acceptsId = true;

export const authErrorStyle = { color: COLORS.danger, fontSize: '13px', fontWeight: '700', margin: '12px 0 0 0' };

const USERNAME_KEY = 'clinic-remembered-username';

const readRememberedUsername = () => {
  try {
    return localStorage.getItem(USERNAME_KEY) || '';
  } catch {
    return '';
  }
};

// "تذكرني": اسم المستخدم يُحفظ في المتصفح، وكلمة السر تُسلَّم لمدير كلمات مرور المتصفح (Credential Management API)
// فيحفظها مشفّرة ويملأها لاحقاً، ولا تُخزَّن نصاً صريحاً في localStorage. بدون "تذكرني" يُمسح كل ذلك.
function saveCredentials(username, password, remember) {
  try {
    if (remember) localStorage.setItem(USERNAME_KEY, username);
    else localStorage.removeItem(USERNAME_KEY);
  } catch {
    /* التخزين غير متاح */
  }
  if (!window.PasswordCredential || !navigator.credentials) return;
  if (remember) {
    navigator.credentials.store(new window.PasswordCredential({ id: username, password, name: username })).catch(() => {});
  } else {
    navigator.credentials.preventSilentAccess?.().catch?.(() => {});
  }
}

export default function LoginScreen({ onLogin, theme, onToggleTheme }) {
  const [username, setUsername] = useState(readRememberedUsername);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => readRememberedUsername() !== '');
  const [error, setError] = useState('');

  // استرجاع كلمة السر المحفوظة من مدير كلمات مرور المتصفح (صامتاً، دون نافذة)
  useEffect(() => {
    if (!readRememberedUsername() || !window.PasswordCredential || !navigator.credentials) return;
    navigator.credentials
      .get({ password: true, mediation: 'silent' })
      .then((cred) => {
        if (cred?.type === 'password' && cred.id === readRememberedUsername()) {
          setUsername(cred.id);
          setPassword(cred.password);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onLogin(username, password, remember);
    if (!result.ok) {
      setError(result.error);
      setPassword('');
      return;
    }
    saveCredentials(username, password, remember);
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

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }} />
          تذكرني
        </label>

        {error && <p style={authErrorStyle} role="alert">{error}</p>}

        <button type="submit" className="btn-warm-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }}>
          <LogIn size={16} /> دخول
        </button>
      </form>
    </AuthShell>
  );
}
