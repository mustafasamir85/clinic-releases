import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import Modal from './Modal';
import AnnouncementImage from './AnnouncementImage';
import { ANNOUNCEMENT_LEVELS, canPostpone } from '../../features/announcements/announcementUtils';

export const formatWhen = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('ar-JO', { dateStyle: 'medium', timeStyle: 'short' });
};

// نافذة رسالة مدير النظام. تظهر فوق الشاشة الحالية، لكن لا تقطع نافذة أخرى مفتوحة (نموذج زيارة مثلاً):
// تنتظر حتى تُغلق ثم تظهر. «تم الاطلاع» يسجّلها مقروءة؛ «لاحقاً» (والإغلاق بـ ✕ أو Esc) تُخفيها في هذه الجلسة فقط.
// الرسالة العاجلة لا تُغلق إلا بـ «تم الاطلاع».
export default function AnnouncementPopup({ item, remaining, onAcknowledge, onPostpone }) {
  const [ready, setReady] = useState(false);

  // ننتظر خلو الشاشة من نوافذ أخرى (الفحص كل ثانية)؛ وبعد ظهورها تبقى حتى تنتهي الرسائل
  useEffect(() => {
    if (!item) {
      setReady(false);
      return undefined;
    }
    if (ready) return undefined;
    const check = () => {
      if (!document.querySelector('[role="dialog"], [role="alertdialog"]')) setReady(true);
    };
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [item, ready]);

  if (!item || !ready) return null;

  const level = ANNOUNCEMENT_LEVELS[item.level] ? item.level : 'info';
  const postponable = canPostpone(item);

  return (
    <Modal
      title={item.title?.trim() || 'رسالة من الإدارة'}
      icon={Megaphone}
      maxWidth={520}
      onClose={postponable ? () => onPostpone(item.id) : undefined}
    >
      <div className={`ann-card ann-level-${level}`}>
        <div className="ann-meta">
          <span className="ann-level">{ANNOUNCEMENT_LEVELS[level].label}</span>
          {remaining > 1 && <span className="ann-count">{remaining - 1} رسالة أخرى بعد هذه</span>}
        </div>
        <p className="ann-message">{item.message}</p>
        {item.has_image && <AnnouncementImage id={item.id} />}
        <p className="ann-from">
          {item.created_by ? `من: ${item.created_by}` : 'من الإدارة'}
          {item.created_at ? ` • ${formatWhen(item.created_at)}` : ''}
        </p>
      </div>

      <div className="ann-actions">
        <button type="button" className="btn-warm-primary" autoFocus onClick={() => onAcknowledge(item.id)}>
          تم الاطلاع
        </button>
        {postponable && (
          <button type="button" className="error-secondary" onClick={() => onPostpone(item.id)} title="تظهر لك ثانية عند فتح التطبيق">
            لاحقاً
          </button>
        )}
      </div>
    </Modal>
  );
}
