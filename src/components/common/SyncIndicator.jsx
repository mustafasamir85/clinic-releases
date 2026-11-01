import { useEffect, useState } from 'react';
import { AlertCircle, Check, CloudOff, Loader2 } from 'lucide-react';
import { useSyncStatus } from '../../utils/syncStatus';

const SAVED_VISIBLE_MS = 3000; // مدة إظهار «تم الحفظ» بعد كل حفظ ناجح

const formatTime = (ms) => new Date(ms).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });

// مؤشر حالة الحفظ في الترويسة. لا يظهر في الحالة العادية؛ يظهر فقط عند:
//  - جاري الحفظ، - لا يوجد اتصال (يبقى حتى يعود)، - تعذّر الحفظ، - ولثلاث ثوانٍ بعد كل حفظ ناجح («تم الحفظ»).
// منطقة aria-live تبقى في الصفحة دائماً (فارغة وغير مرئية حين لا يظهر شيء) كي تُعلَن التغييرات لقارئ الشاشة.
export default function SyncIndicator() {
  const { status, pending, message, lastSavedAt } = useSyncStatus();
  const [recentlySaved, setRecentlySaved] = useState(false);

  useEffect(() => {
    if (!lastSavedAt) {
      setRecentlySaved(false);
      return undefined;
    }
    setRecentlySaved(true);
    const timer = setTimeout(() => setRecentlySaved(false), SAVED_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [lastSavedAt]);

  const quiet = status === 'idle' && !recentlySaved;

  const view = {
    idle: { Icon: Check, label: 'تم الحفظ', title: lastSavedAt ? `آخر حفظ: ${formatTime(lastSavedAt)}` : undefined },
    saving: { Icon: Loader2, label: 'جاري الحفظ…', title: pending > 1 ? `جاري حفظ ${pending} مجموعات` : 'جاري حفظ التغييرات', spin: true },
    offline: { Icon: CloudOff, label: 'لا يوجد اتصال', title: 'لا يوجد اتصال بالسيرفر. ستُحفظ التغييرات تلقائياً فور عودته، فلا تُغلق الصفحة.' },
    error: { Icon: AlertCircle, label: 'تعذّر الحفظ', title: message || 'رفض السيرفر بعض التغييرات' },
  }[status];

  const { Icon } = view;
  return (
    <div
      className={quiet ? 'sync-indicator-quiet' : `sync-indicator sync-${status}`}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      title={quiet ? undefined : view.title}
    >
      {!quiet && (
        <>
          <Icon size={15} className={view.spin ? 'animate-spin' : undefined} aria-hidden="true" />
          <span className="sync-indicator-label">{view.label}</span>
        </>
      )}
    </div>
  );
}
