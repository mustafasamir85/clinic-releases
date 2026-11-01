import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, ackAnnouncement, getActiveAnnouncements } from '../api';
import { nextVisible, sortPending, withoutId } from '../features/announcements/announcementUtils';

const POLL_MS = 30000; // من كان فاتحاً للتطبيق تصله الرسالة خلال هذه المدة
const MIN_GAP_MS = 10000; // أقل فاصل بين طلبين (عند العودة للتبويب)

// رسائل المدير الموجَّهة للجميع:
//  - تُجلب غير المقروءة عند فتح التطبيق، ثم كل 30 ثانية ما دام التبويب ظاهراً، وعند العودة إليه.
//  - «تم الاطلاع» (acknowledge) يسجَّل على السيرفر لهذا المستخدم فلا تظهر له ثانية (ولو من جهاز آخر).
//  - «لاحقاً» (postpone) تُخفي الرسالة في هذه الجلسة فقط وتعود عند فتح التطبيق مجدداً. العاجل لا يُؤجَّل.
//  - إن لم يدعم السيرفر الميزة (404/405/403) نتوقف بصمت دون إزعاج المستخدم.
export function useAnnouncements(enabled) {
  const [pending, setPending] = useState([]);
  const [postponed, setPostponed] = useState(() => new Set());
  const supported = useRef(true);
  const lastPoll = useRef(0);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || !supported.current || inflight.current || document.hidden) return;
    inflight.current = true;
    lastPoll.current = Date.now();
    try {
      const res = await getActiveAnnouncements();
      setPending(sortPending(Array.isArray(res?.items) ? res.items : []));
    } catch (error) {
      if (error instanceof ApiError && [403, 404, 405, 501].includes(error.status)) supported.current = false;
      // غير ذلك (انقطاع/خطأ مؤقت): نعيد المحاولة في الدورة التالية
    } finally {
      inflight.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setPending([]);
      setPostponed(new Set());
      supported.current = true;
      return undefined;
    }
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastPoll.current >= MIN_GAP_MS) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh]);

  // تم الاطلاع: نُخفيها فوراً ثم نسجّل على السيرفر. إن فشل التسجيل تعود في الدورة التالية (لم تُسجَّل مقروءة).
  const acknowledge = useCallback(async (id) => {
    setPending((list) => withoutId(list, id));
    try {
      await ackAnnouncement(id);
    } catch {
      /* ستظهر ثانية عند التحديث التالي إن لم تُسجَّل */
    }
  }, []);

  const postpone = useCallback((id) => setPostponed((set) => new Set(set).add(id)), []);

  const visible = nextVisible(pending, postponed);
  const remaining = pending.filter((i) => i.level === 'urgent' || !postponed.has(i.id)).length;

  return { visible, remaining, acknowledge, postpone, refresh };
}
