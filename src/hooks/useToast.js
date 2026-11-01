import { useCallback, useEffect, useRef, useState } from 'react';

// إشعار مؤقت يُنظَّف تلقائياً. الاستخدام:
//   notify('تم الحفظ');                                  // نجاح (الافتراضي)
//   notify('تعذر الحفظ', 5000);                          // مدة مخصّصة (توافقاً مع الاستخدام القديم)
//   notify('...', { type: 'error' | 'warning' | 'info' | 'success', duration, action: { label, onClick } });
// إن لم يُحدَّد النوع يُستنتج من بداية النص (تعذّر/فشل/خطأ ← خطأ، لا يوجد/لا يمكن/تنبيه ← تحذير).
const ERROR_START = /^(تعذّ?ر|فشل|خطأ)/;
const WARNING_START = /^(لا يمكن|لا يوجد|لا توجد|تنبيه)/;
const inferType = (text) => {
  const t = String(text ?? '').trim();
  if (ERROR_START.test(t)) return 'error';
  if (WARNING_START.test(t)) return 'warning';
  return 'success';
};

export function useToast(defaultDuration = 3000) {
  const [toast, setToast] = useState(null); // { id, text, type, action }
  const timer = useRef(null);
  const endsAt = useRef(0);
  const remaining = useRef(0);

  const start = useCallback((ms) => {
    clearTimeout(timer.current);
    remaining.current = ms;
    endsAt.current = Date.now() + ms;
    timer.current = setTimeout(() => setToast(null), ms);
  }, []);

  const show = useCallback(
    (text, options) => {
      const o = typeof options === 'number' ? { duration: options } : options ?? {};
      const type = o.type ?? inferType(text);
      // الأخطاء والإشعارات ذات الإجراء تبقى وقتاً أطول ليُقرأ النص أو يُضغط الزر
      const duration = o.duration ?? (o.action ? Math.max(defaultDuration, 6000) : type === 'error' ? Math.max(defaultDuration, 5000) : defaultDuration);
      setToast({ id: `${Date.now()}-${Math.random()}`, text, type, action: o.action ?? null });
      start(duration);
    },
    [defaultDuration, start]
  );

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  // عند مرور الفأرة/التركيز يتوقف العدّاد حتى يُقرأ الإشعار أو يُضغط زره
  const pause = useCallback(() => {
    clearTimeout(timer.current);
    remaining.current = Math.max(endsAt.current - Date.now(), 1500);
  }, []);
  const resume = useCallback(() => {
    if (remaining.current > 0) start(remaining.current);
  }, [start]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, show, dismiss, pause, resume };
}
