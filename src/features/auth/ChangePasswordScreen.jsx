import { useState } from 'react';
import { LogOut, Save } from 'lucide-react';
import { cancelButtonStyle } from '../../styles';
import Field from '../../components/common/Field';
import { AuthShell, PasswordInput, authErrorStyle } from './LoginScreen';

// شاشة إجبارية تظهر بعد الدخول بالحساب الافتراضي لتعيين كلمة مرور جديدة
export default function ChangePasswordScreen({ user, onChange, onLogout, theme, onToggleTheme }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    const message = await onChange(password);
    if (message) setError(message);
  };

  return (
    <AuthShell title="تعيين كلمة مرور جديدة" subtitle={`مرحباً ${user.name}، يجب تغيير كلمة المرور الافتراضية قبل المتابعة.`} theme={theme} onToggleTheme={onToggleTheme}>
      <form onSubmit={handleSubmit}>
        <Field label="كلمة المرور الجديدة">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
        </Field>
        <Field label="تأكيد كلمة المرور" style={{ marginTop: '12px' }}>
          <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>

        {error && <p style={authErrorStyle} role="alert">{error}</p>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button type="submit" className="btn-warm-primary" style={{ flex: 1, justifyContent: 'center' }}>
            <Save size={16} /> حفظ ومتابعة
          </button>
          <button type="button" onClick={onLogout} style={cancelButtonStyle}>
            <LogOut size={14} /> خروج
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
