import { getVersions } from '../api';

// مُستطلِع واحد مشترك لكل مجموعات البيانات: يسأل السيرفر بطلب صغير (إصدار كل مجموعة) بدل جلب كل قائمة كاملة.
// كل مجموعة تشترك فيه عبر subscribeVersions وتُبلَّغ بالإصدارات الأخيرة لتقرر هل تعيد التحميل.
const POLL_MS = 30000;
const MIN_GAP_MS = 10000; // أقل فاصل بين طلبين (يمنع الطلبات المتتالية عند تبديل التبويبات)

const subscribers = new Set();
let timer = null;
let inflight = false;
let lastPoll = 0;

async function poll() {
  if (inflight || document.hidden || subscribers.size === 0) return;
  inflight = true;
  lastPoll = Date.now();
  try {
    const res = await getVersions();
    if (res?.versions) subscribers.forEach((fn) => fn(res.versions));
  } catch {
    /* لا اتصال الآن أو انتهت الجلسة (يعالجها حدث clinic-unauthorized): نعيد المحاولة في الدورة التالية */
  } finally {
    inflight = false;
  }
}

const onVisible = () => {
  if (!document.hidden && Date.now() - lastPoll >= MIN_GAP_MS) poll();
};

// يعيد دالة إلغاء الاشتراك. يبدأ المؤقت مع أول مشترك ويتوقف مع خروج آخر مشترك.
export function subscribeVersions(fn) {
  subscribers.add(fn);
  if (subscribers.size === 1) {
    timer = setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
  }
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener('visibilitychange', onVisible);
    }
  };
}
