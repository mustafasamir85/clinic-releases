import { useCallback, useEffect, useState } from 'react';

// مفتاح جديد: نسخة سابقة كانت تحفظ الوضع تلقائياً عند أول تشغيل (فاتح)،
// فيبقى الفاتح عالقاً عند بعض المستخدمين. المفتاح الجديد لا يحمل إلا اختياراً صريحاً.
const STORAGE_KEY = 'clinic-theme-choice';

// قراءة آمنة: المتصفح قد يمنع localStorage (وضع خاص مثلاً)
const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

// الوضع الداكن هو الافتراضي (أريح للعين) ما لم يختر المستخدم غيره بالزر
const initialTheme = () => {
  const stored = readStored();
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
};

export function useTheme() {
  const [theme, setTheme] = useState(initialTheme);

  // تطبيق الوضع على <html> (يُقرأ في App.css عبر data-theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // الحفظ يتم عند ضغط الزر فقط، فلا يُثبَّت الافتراضي كأنه اختيار
  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* التخزين غير متاح — لا مشكلة */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
