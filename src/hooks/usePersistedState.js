import { useCallback, useState } from 'react';

// حالة كائن (مثل فلاتر شاشة) تُحفظ في localStorage وتُستعاد عند فتح الشاشة من جديد.
// scopeKey: مفتاح فريد (يتضمن اسم المستخدم كي لا تتشارك الحسابات فلاترها). defaults: القيم الافتراضية.
// القيم المحفوظة تُدمج فوق الافتراضية، فإضافة حقل جديد لاحقاً لا تكسر ما حُفظ سابقاً،
// وكل حقل يُتحقَّق منه بـ validate(key, value) (إن وُجد) فلا تُستعاد قيمة فاسدة.
const PREFIX = 'clinic-filters:v1:';

export function usePersistedState(scopeKey, defaults, validate) {
  const storageKey = scopeKey ? `${PREFIX}${scopeKey}` : null;

  const [state, setState] = useState(() => {
    if (!storageKey) return defaults;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || typeof saved !== 'object') return defaults;
      const merged = { ...defaults };
      Object.keys(defaults).forEach((k) => {
        if (k in saved && typeof saved[k] === typeof defaults[k] && (!validate || validate(k, saved[k]))) merged[k] = saved[k];
      });
      return merged;
    } catch {
      return defaults;
    }
  });

  const persist = useCallback(
    (next) => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* التخزين غير متاح: تعمل الفلاتر في الجلسة فقط */
      }
    },
    [storageKey]
  );

  // changes: كائن جزئي، أو بلا وسيط لإعادة الافتراضي (ويُحذف المحفوظ)
  const update = useCallback(
    (changes) => {
      setState((current) => {
        const next = changes ? { ...current, ...changes } : defaults;
        if (changes) persist(next);
        else if (storageKey) {
          try {
            localStorage.removeItem(storageKey);
          } catch {
            /* تجاهل */
          }
        }
        return next;
      });
    },
    [persist, storageKey, defaults]
  );

  return [state, update];
}
