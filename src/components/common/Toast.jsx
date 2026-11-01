import { AlertCircle, AlertTriangle, Check, Info, X } from 'lucide-react';

const VARIANTS = {
  success: { icon: Check, live: 'polite', role: 'status' },
  info: { icon: Info, live: 'polite', role: 'status' },
  warning: { icon: AlertTriangle, live: 'assertive', role: 'alert' },
  error: { icon: AlertCircle, live: 'assertive', role: 'alert' },
};

// إشعار أسفل الشاشة بأربعة أنواع (نجاح/معلومة/تحذير/خطأ) وزر إغلاق وزر إجراء اختياري (مثل «تراجع»).
// يتوقف العدّاد عند مرور الفأرة أو التركيز عليه. الألوان من متغيّرات الثيم في App.css (.app-toast-*).
export default function Toast({ toast, onDismiss, onPause, onResume }) {
  if (!toast) return null;
  const v = VARIANTS[toast.type] ?? VARIANTS.success;
  const Icon = v.icon;

  return (
    <div
      key={toast.id}
      className={`app-toast app-toast-${toast.type}`}
      role={v.role}
      aria-live={v.live}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
    >
      <span className="app-toast-icon"><Icon size={16} strokeWidth={3} /></span>
      <span className="app-toast-text">{toast.text}</span>
      {toast.action && (
        <button
          type="button"
          className="app-toast-action"
          onClick={() => {
            toast.action.onClick?.();
            onDismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className="app-toast-close" aria-label="إغلاق الإشعار" onClick={onDismiss}>
        <X size={16} />
      </button>
    </div>
  );
}
