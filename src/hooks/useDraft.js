import { useCallback, useEffect, useRef, useState } from 'react';

// حفظ مسودة نموذج الزيارة محلياً (localStorage) كل بضع ثوانٍ، لتعود للمستخدم لو أُغلقت الصفحة أو انقطع الاتصال.
// المسودة واحدة لكل (مستخدم + قسم): { savedAt, patientId, patientName, values }.
// عند فتح النموذج وفيه مسودة قديمة لا نفرضها على المستخدم: نعرض شريطاً يسأله «استرجاع / تجاهل»،
// ونوقف الحفظ التلقائي حتى يختار، كي لا تُكتب فوق المسودة القديمة بحرف واحد.
const PREFIX = 'clinic-draft:v1:';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // المسودة الأقدم من أسبوع تُهمَل
const SAVE_DELAY_MS = 3000; // الحفظ بعد 3 ثوانٍ من آخر تعديل

// كل عمليات التخزين محاطة بـ try/catch: المتصفح قد يمنع localStorage أو تمتلئ حصته
const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== 'object' || !draft.values || Date.now() - draft.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
};
const write = (key, draft) => {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    /* التخزين غير متاح: نتجاهل بصمت، والنموذج يعمل كالمعتاد */
  }
};
const remove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* تجاهل */
  }
};

// تُستدعى عند تسجيل الخروج الصريح: لا نترك بيانات مرضى على جهاز مشترك
export function clearAllDrafts() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
  } catch {
    /* تجاهل */
  }
}

// userKey: اسم المستخدم الحالي — scope: القسم ('ent' | 'audio' | 'speech')
// values: كل ما يُحفظ (يجب أن يكون قابلاً للتحويل إلى JSON) — hasContent: هل كُتب شيء فعلاً؟ (بدونه لا نحفظ)
// onRestore(values): يضع القيم المسترجعة في حالة النموذج
// ملاحظة: استدعِه بعد usePatientInsurance كي تُطبَّق قيمة التأمين المسترجعة بعد إعادة ضبطها لتأمين المريض.
export function useDraft({ userKey, scope, values, hasContent, patient, patients, onSelectPatient, onRestore }) {
  const key = userKey ? `${PREFIX}${userKey}:${scope}` : null;
  const [pending, setPending] = useState(() => (key ? read(key) : null)); // مسودة قديمة بانتظار قرار المستخدم
  const [applying, setApplying] = useState(null); // مسودة قيد التطبيق (تنتظر اختيار مريضها)
  const [savedAt, setSavedAt] = useState(null);

  // آخر قيم للقراءة داخل المؤقّت ومستمعات الصفحة دون إعادة تسجيلها كل رسم
  const latest = useRef({});
  latest.current = { key, values, hasContent, patient };
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;
  const dirty = useRef(false); // تعديلات لم تُكتب بعد

  const flush = useCallback(() => {
    const { key: k, values: v, hasContent: has, patient: p } = latest.current;
    if (!k || !dirty.current || pendingRef.current || !has) return false;
    dirty.current = false;
    write(k, { savedAt: Date.now(), patientId: p?.id ?? null, patientName: p?.name ?? '', values: v });
    return true;
  }, []);

  // الحفظ التلقائي: مؤقّت يُعاد ضبطه مع كل تعديل. إن فُرّغ النموذج تُحذف المسودة.
  const json = JSON.stringify(values);
  useEffect(() => {
    if (!key || pending || applying) return undefined;
    if (!hasContent) {
      dirty.current = false;
      remove(key);
      setSavedAt(null);
      return undefined;
    }
    dirty.current = true;
    const timer = setTimeout(() => {
      if (flush()) setSavedAt(Date.now());
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [json, key, pending, applying]); // eslint-disable-line react-hooks/exhaustive-deps

  // كتابة فورية عند إخفاء الصفحة/إغلاقها وعند مغادرة الشاشة (تبديل التبويب)
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush]);

  // استرجاع: نختار مريض المسودة أولاً، ثم نطبّق القيم عندما يصبح هو المريض الحالي
  const restore = () => {
    if (!pending) return;
    const target = pending.patientId != null ? patients.find((p) => String(p.id) === String(pending.patientId)) : null;
    if (target && target.id !== patient?.id) onSelectPatient(target);
    setApplying({ values: pending.values, patientId: target?.id ?? patient?.id ?? null });
    setPending(null);
  };

  useEffect(() => {
    if (!applying) return;
    if (applying.patientId != null && patient?.id !== applying.patientId) return; // ننتظر تحديد المريض
    onRestoreRef.current(applying.values);
    setApplying(null);
  }, [applying, patient?.id]);

  const discard = () => {
    if (key) remove(key);
    setPending(null);
  };

  // بعد حفظ الزيارة فعلاً: نحذف المسودة (إلا إن كانت مسودة قديمة لم يقرر المستخدم بشأنها)
  const clear = () => {
    dirty.current = false;
    setSavedAt(null);
    if (key && !pendingRef.current) remove(key);
  };

  return { pending, savedAt, restore, discard, clear };
}
