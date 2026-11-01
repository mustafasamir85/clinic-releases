import { Loader2 } from 'lucide-react';
import clinicLogo from '../../assets/logo.jpeg';
import { CLINIC_NAME } from '../../constants';

// شاشة بداية أثناء التحقق من الجلسة المحفوظة (بدل شاشة بيضاء)
export default function SplashScreen() {
  return (
    <div className="splash-screen" role="status" aria-live="polite">
      <img className="splash-logo" src={clinicLogo} alt="" />
      <h1 className="splash-title">{CLINIC_NAME}</h1>
      <p className="splash-text">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> جاري التحقق من الجلسة...
      </p>
    </div>
  );
}
