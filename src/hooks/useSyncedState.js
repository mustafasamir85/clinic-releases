import { useEffect, useRef, useState } from 'react';
import { ApiError, getCollection, syncCollection } from '../api';

const DEBOUNCE_MS = 250;
const RETRY_MS = [2000, 5000, 15000, 30000]; // مهلات إعادة محاولة الحفظ عند انقطاع الاتصال
const REFRESH_MS = 30000; // تحديث دوري لتعديلات المستخدمين الآخرين

// رفض نهائي من السيرفر (صلاحية/تحقق/حجم): لا فائدة من إعادة المحاولة. 401 يعالجه تسجيل الخروج.
const isPermanent = (err) =>
  err instanceof ApiError && err.status >= 400 && err.status < 500 && ![401, 408, 429].includes(err.status);

const snapshot = (list) => new Map(list.map((x) => [String(x.id), JSON.stringify(x)]));
const sameMap = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);

// بديل useState لقائمة سجلات تُحفظ على السيرفر (مجموعة collection):
//  - عند التفعيل (enabled = مستخدم مسجّل) تُحمَّل القائمة من السيرفر.
//  - إن كانت المجموعة جديدة (لم تُهيَّأ بعد) تُرفع البيانات الابتدائية initial مرة واحدة.
//  - أي تغيير لاحق يُقارَن بآخر نسخة مؤكدة من السيرفر، وتُرسَل الفروقات فقط (إضافة/تعديل/حذف).
//  - فشل الحفظ بسبب الاتصال يُعاد تلقائياً؛ والرفض النهائي (مثل 403) يُرجِع البيانات لنسخة السيرفر.
//  - تُحدَّث القائمة دورياً (وعند العودة للتبويب) بتعديلات الآخرين ما دامت لا توجد تعديلات محلية غير محفوظة.
//  - يُحذَّر المستخدم عند إغلاق الصفحة وفيها تعديلات لم تُحفظ.
// يعيد [items, setItems, status, refresh] حيث status = { loading, error }، وrefresh() يعيد التحميل من السيرفر فوراً.
// كل سجل يجب أن يحتوي id. نفس واجهة setState فلا تتغير بقية الـ hooks.
export function useSyncedState(collection, initial, enabled) {
  const [items, setItems] = useState(initial);
  const [status, setStatus] = useState({ loading: true, error: null });

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const server = useRef(new Map()); // آخر حالة مؤكدة: id → JSON
  const ready = useRef(false); // اكتمل التحميل ويُسمح بالمزامنة
  const writable = useRef(true);
  const queue = useRef(Promise.resolve()); // طلبات متتابعة لضمان الترتيب
  const timer = useRef(null); // مؤقت تجميع التعديلات
  const retryTimer = useRef(null);
  const retries = useRef(0);
  const inflight = useRef(0);

  const fail = (message) => {
    setStatus((s) => ({ ...s, error: message }));
    window.dispatchEvent(new CustomEvent('clinic-sync-error', { detail: message }));
  };

  // الفروقات بين الحالة الحالية وآخر نسخة مؤكدة
  const diff = () => {
    const list = itemsRef.current;
    const current = snapshot(list);
    const upsert = list.filter((x) => server.current.get(String(x.id)) !== current.get(String(x.id)));
    const remove = [...server.current.keys()].filter((id) => !current.has(id));
    return { current, upsert, remove };
  };

  // هل توجد تعديلات محلية لم تصل للسيرفر؟
  const isDirty = () => {
    if (timer.current !== null || inflight.current > 0) return true;
    const { upsert, remove } = diff();
    return upsert.length > 0 || remove.length > 0;
  };

  // تحميل نسخة السيرفر. force=false (التحديث الدوري) صامت ولا يمس التعديلات غير المحفوظة.
  const reload = async (force = false) => {
    if (!ready.current) return;
    try {
      const data = await getCollection(collection);
      if (!ready.current) return;
      writable.current = data.writable;
      if (!data.initialized) return;
      const next = snapshot(data.items);
      if (!force && (isDirty() || sameMap(next, server.current))) return; // الفحص بعد الانتظار: قد يكون المستخدم عدّل أثناءه
      server.current = next;
      setItems(data.items);
    } catch (err) {
      if (force) fail(`تعذر تحديث البيانات (${collection}): ${err.message}`);
    }
  };

  const scheduleRetry = () => {
    clearTimeout(retryTimer.current);
    const delay = RETRY_MS[Math.min(retries.current, RETRY_MS.length - 1)];
    retries.current += 1;
    // eslint-disable-next-line no-use-before-define
    retryTimer.current = setTimeout(flush, delay);
  };

  // إرسال الفروقات للسيرفر
  const flush = () => {
    timer.current = null;
    retryTimer.current = null;
    if (!ready.current || !writable.current) return;
    const { current, upsert, remove } = diff();
    if (upsert.length === 0 && remove.length === 0) return;

    // نعتبرها مؤكدة فور الإرسال كي لا تتكرر؛ ونتراجع عنها عند الفشل
    const previous = server.current;
    server.current = current;
    inflight.current += 1;

    queue.current = queue.current
      .then(() => syncCollection(collection, upsert, remove))
      .then(() => {
        retries.current = 0;
      })
      .catch((err) => {
        server.current = previous;
        fail(`تعذر حفظ التغييرات (${collection}): ${err.message}`);
        if (!isPermanent(err)) scheduleRetry();
        else if (err.status !== 401) reload(true); // رُفضت التعديلات: نعيد عرض ما هو محفوظ فعلاً
      })
      .finally(() => {
        inflight.current -= 1;
      });
  };

  // ===== التحميل =====
  useEffect(() => {
    if (!enabled) {
      // بعد الخروج: نمسح بيانات المستخدم السابق من الذاكرة
      ready.current = false;
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
      setItems(initial);
      return undefined;
    }

    let cancelled = false;
    setStatus({ loading: true, error: null });

    (async () => {
      try {
        const data = await getCollection(collection);
        if (cancelled) return;
        writable.current = data.writable;

        let list = data.items;
        if (!data.initialized) {
          list = initial;
          if (data.writable) await syncCollection(collection, initial, []); // رفع البيانات الابتدائية مرة واحدة
        }
        if (cancelled) return;

        server.current = snapshot(list);
        ready.current = true;
        setItems(list);
        setStatus({ loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        // لا صلاحية لقراءتها: تبقى القائمة فارغة/ابتدائية محلياً دون مزامنة
        if (err instanceof ApiError && err.status === 403) writable.current = false;
        else fail(`تعذر تحميل البيانات (${collection}): ${err.message}`);
        setStatus((s) => ({ ...s, loading: false }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // initial ثابتة بطبيعتها (بيانات ابتدائية)
  }, [collection, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== الحفظ: مقارنة الحالة الحالية بآخر نسخة مؤكدة وإرسال الفروقات =====
  useEffect(() => {
    if (!enabled || !ready.current || !writable.current) return undefined;

    clearTimeout(timer.current); // تجميع التعديلات المتتابعة في طلب واحد
    timer.current = setTimeout(flush, DEBOUNCE_MS);
    return undefined;
    // لا نلغي المؤقت عند التنظيف: التغيير الأخير يُرسل حتى لو انتقل المستخدم أو خرج
  }, [items, enabled, collection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== التحديث الدوري + عند العودة للتبويب =====
  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => {
      if (!document.hidden) reload(false);
    };
    const id = setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [enabled, collection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== تحذير عند إغلاق الصفحة وفيها تعديلات غير محفوظة =====
  useEffect(() => {
    if (!enabled) return undefined;
    const onBeforeUnload = (e) => {
      if (ready.current && writable.current && isDirty()) {
        e.preventDefault();
        e.returnValue = ''; // مطلوب في بعض المتصفحات لإظهار التحذير
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return [items, setItems, status, () => reload(true)];
}
