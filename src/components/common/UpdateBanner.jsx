import { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';

// ملف الحزمة الرئيسي الذي حمّلته هذه الصفحة (index-XXXX.js). في وضع التطوير لا يوجد فلا نفعل شيئاً.
const loadedBundle = () => {
  const src = [...document.scripts].map((s) => s.src).find((s) => /\/assets\/index-[^/]+\.js/.test(s));
  return src?.match(/(index-[^/]+\.js)/)?.[1] ?? null;
};

// آخر ملف حزمة مذكور في index.html على الخادم (يُجلب بلا تخزين مؤقت)
async function latestBundle() {
  // أي حالة غير 2xx ترمي خطأً يلتقطه المستدعي (فنُعيد المحاولة لاحقاً)
  const res = await axios.get(window.location.pathname, {
    params: { _: Date.now() },
    responseType: 'text',
    headers: { 'Cache-Control': 'no-store' },
  });
  return String(res.data).match(/\/assets\/(index-[^"'/]+\.js)/)?.[1] ?? null;
}

const CHECK_EVERY_MS = 5 * 60 * 1000;

// شريط يظهر للجميع عند نشر إصدار جديد على الخادم، ليُحمّلوه بضغطة بدل أن تبقى صفحاتهم القديمة مفتوحة
export default function UpdateBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const mine = loadedBundle();
    if (!mine) return undefined;

    let stopped = false;
    const check = async () => {
      try {
        const latest = await latestBundle();
        if (!stopped && latest && latest !== mine) setStale(true);
      } catch {
        /* لا اتصال الآن: نعيد المحاولة لاحقاً */
      }
    };

    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, []);

  if (!stale) return null;

  return (
    <div className="update-banner no-print" role="status">
      <span>🔔 يتوفر إصدار جديد من التطبيق.</span>
      <button type="button" onClick={() => window.location.reload()} className="btn-warm-primary" style={{ padding: '6px 14px', fontSize: '13px' }}>
        <RefreshCw size={14} /> تحديث الصفحة الآن
      </button>
    </div>
  );
}
