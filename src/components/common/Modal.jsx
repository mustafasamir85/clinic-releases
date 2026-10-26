import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { COLORS } from '../../styles';

// نافذة منبثقة موحّدة. تُغلق بزر X أو بمفتاح Escape.
export default function Modal({ title, icon: Icon, subtitle, maxWidth = 480, onClose, header, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // تُعرض النافذة في body مباشرة (Portal) لتبقى خارج المحتوى الذي يُخفى عند الطباعة
  return createPortal(
    <div className="warm-overlay">
      <div className="warm-modal" style={{ maxWidth }}>
        {header ?? (
          <div style={{ marginBottom: subtitle ? '6px' : '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {Icon && <Icon size={20} color={COLORS.gold} />} {title}
              </h3>
              {onClose && (
                <button type="button" onClick={onClose} aria-label="إغلاق" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color={COLORS.muted} />
                </button>
              )}
            </div>
            {subtitle && <p style={{ margin: '6px 0 14px 0', color: COLORS.muted, fontSize: '13px' }}>{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
