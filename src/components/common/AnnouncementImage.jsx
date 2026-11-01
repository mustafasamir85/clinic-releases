import { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { getAnnouncementImage } from '../../api';

// يحمّل صورة رسالة كـ blob بطلب مصادَق ويعيد رابطاً مؤقتاً لها (يُحرَّر عند إزالة المكوّن)
export function useAnnouncementImage(id) {
  const [state, setState] = useState({ url: null, failed: false });

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    setState({ url: null, failed: false });
    getAnnouncementImage(id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, failed: false });
      })
      .catch(() => !cancelled && setState({ url: null, failed: true }));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  return state;
}

// صورة مرفقة برسالة. النقر عليها يفتحها كاملة في تبويب جديد.
export default function AnnouncementImage({ id, className = '' }) {
  const { url, failed } = useAnnouncementImage(id);

  if (failed) {
    return (
      <p className="ann-image-state" role="status">
        <ImageOff size={16} aria-hidden="true" /> تعذّر تحميل الصورة.
      </p>
    );
  }
  if (!url) {
    return (
      <p className="ann-image-state" role="status">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> جاري تحميل الصورة...
      </p>
    );
  }
  return (
    <button type="button" className={`ann-image-btn ${className}`} onClick={() => window.open(url, '_blank', 'noopener')} title="انقر لعرض الصورة كاملة" aria-label="عرض الصورة المرفقة كاملة">
      <img src={url} alt="صورة مرفقة بالرسالة" />
    </button>
  );
}
