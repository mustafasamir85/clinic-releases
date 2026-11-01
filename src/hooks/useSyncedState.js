import { useEffect, useRef, useState } from 'react';
import { ApiError, getCollection, syncCollection } from '../api';
import { subscribeVersions } from '../utils/versionPoller';
import { reportSync } from '../utils/syncStatus';

const DEBOUNCE_MS = 250;
const RETRY_MS = [2000, 5000, 15000, 30000]; // مهلات إعادة محاولة الحفظ عند انقطاع الاتصال

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
//  - تُحدَّث القائمة بتعديلات الآخرين ما دامت لا توجد تعديلات محلية غير محفوظة، لكن دون جلبها دورياً:
//    مُستطلِع مشترك يسأل السيرفر بطلب صغير عن إصدار كل مجموعة، ولا تُجلب القائمة كاملة إلا إن تغيّر إصدارها.
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
  const serverVersion = useRef(null); // إصدار المجموعة الذي تطابقه نسختنا المحلية
  const reloading = useRef(false);

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
    if (!ready.current || (!force && reloading.current)) return; // التحديث الصامت لا يتزاحم؛ أما الإجباري (بعد الاستيراد مثلاً) فيُنفَّذ دائماً
    reloading.current = true;
    try {
      const data = await getCollection(collection);
      if (!ready.current) return;
      writable.current = data.writable;
      if (!data.initialized) return;
      const next = snapshot(data.items);
      if (!force && isDirty()) return; // الفحص بعد الانتظار: قد يكون المستخدم عدّل أثناءه (نُبقي الإصدار القديم فنعيد المحاولة في الدورة التالية)
      serverVersion.current = data.version ?? null;
      if (!force && sameMap(next, server.current)) return;
      server.current = next;
      setItems(data.items);
    } catch (err) {
      if (force) fail(`تعذر تحديث البيانات (${collection}): ${err.message}`);
    } finally {
      reloading.current = false;
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
    if (upsert.length === 0 && remove.length === 0) {
      if (inflight.current === 0) reportSync(collection, 'idle');
      return;
    }

    // نعتبرها مؤكدة فور الإرسال كي لا تتكرر؛ ونتراجع عنها عند الفشل
    const previous = server.current;
    server.current = current;
    inflight.current += 1;

    queue.current = queue.current
      .then(() => syncCollection(collection, upsert, remove))
      .then((res) => {
        retries.current = 0;
        // نُبلّغ بالنجاح فقط إن لم يبقَ طلب آخر قيد الإرسال أو تعديل ينتظر مؤقت التجميع
        if (inflight.current <= 1 && timer.current === null) reportSync(collection, 'saved');
        // لم يعدّل أحد غيرنا في الأثناء (الإصدار السابق = ما كنا نعرفه): نتبنّى الإصدار الجديد فلا نعيد جلب قائمة حفظناها للتو
        if (res?.version && res.previous === serverVersion.current) serverVersion.current = res.version;
      })
      .catch((err) => {
        server.current = previous;
        fail(`تعذر حفظ التغييرات (${collection}): ${err.message}`);
        if (!isPermanent(err)) {
          reportSync(collection, 'retrying');
          scheduleRetry();
        } else {
          reportSync(collection, err.status === 401 ? 'idle' : 'error', err.message);
          if (err.status !== 401) reload(true); // رُفضت التعديلات: نعيد عرض ما هو محفوظ فعلاً
        }
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
      reportSync(collection, 'idle');
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
        let version = data.version ?? null;
        if (!data.initialized) {
          list = initial;
          if (data.writable) {
            const res = await syncCollection(collection, initial, []); // رفع البيانات الابتدائية مرة واحدة
            if (res?.version && res.previous === version) version = res.version;
          }
        }
        if (cancelled) return;

        server.current = snapshot(list);
        serverVersion.current = version;
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
    // نُظهر «جاري الحفظ» فقط إن وُجد فرق فعلي (لا عند التحميل الأول أو إعادة جلب نسخة السيرفر)
    const pending = diff();
    if (pending.upsert.length > 0 || pending.remove.length > 0) reportSync(collection, 'saving');
    return undefined;
    // لا نلغي المؤقت عند التنظيف: التغيير الأخير يُرسل حتى لو انتقل المستخدم أو خرج
  }, [items, enabled, collection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== تعديلات الآخرين: نعيد التحميل فقط حين يتغيّر إصدار مجموعتنا على السيرفر =====
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribeVersions((versions) => {
      const version = versions[collection];
      if (version !== undefined && version !== serverVersion.current) reload(false);
    });
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
