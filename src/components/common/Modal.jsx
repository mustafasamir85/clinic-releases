import { useCallback, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { COLORS } from '../../styles';
import { useDialog } from '../../hooks/useDialog';
import { useConfirm } from './ConfirmDialog';

// نافذة منبثقة موحّدة. تُغلق بزر X أو بمفتاح Escape.
// - إمكانية الوصول: role="dialog" و aria-modal، وتركيز تلقائي على أول حقل، وحبس Tab داخلها، وإعادة التركيز عند الإغلاق.
// - warnUnsaved: في نماذج الإدخال، إن كتب المستخدم شيئاً ثم حاول الإغلاق (X أو Escape) نسأله قبل ضياع ما كتب.
//   (الإغلاق بعد الحفظ يتم من المكوّن الأب مباشرة فلا يمرّ بهذا السؤال. وأي حقل بسمة data-no-dirty لا يُحتسب.)
export default function Modal({ title, icon: Icon, subtitle, maxWidth = 480, onClose, header, warnUnsaved = false, children }) {
  const confirm = useConfirm();
  const ref = useRef(null);
  const dirty = useRef(false);
  const asking = useRef(false);
  const titleId = useId();

  const requestClose = useCallback(async () => {
    if (!onClose || asking.current) return;
    if (warnUnsaved && dirty.current) {
      asking.current = true;
      const discard = await confirm({
        title: 'تغييرات غير محفوظة',
        message: 'لديك تغييرات لم تُحفظ بعد.\nهل تريد إغلاق النافذة وتجاهلها؟',
        confirmLabel: 'إغلاق وتجاهل التغييرات',
        cancelLabel: 'متابعة التعديل',
        danger: true,
      });
      asking.current = false;
      if (!discard) return;
    }
    onClose();
  }, [onClose, warnUnsaved, confirm]);

  useDialog(ref, { onEscape: requestClose });

  const markDirty = (e) => {
    if (warnUnsaved && !e.target.closest?.('[data-no-dirty]')) dirty.current = true;
  };

  // تُعرض النافذة في body مباشرة (Portal) لتبقى خارج المحتوى الذي يُخفى عند الطباعة
  return createPortal(
    <div className="warm-overlay">
      <div
        ref={ref}
        className="warm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={!header && title ? titleId : undefined}
        tabIndex={-1}
        style={{ maxWidth, outline: 'none' }}
        onInput={markDirty}
      >
        {header ?? (
          <div style={{ marginBottom: subtitle ? '6px' : '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id={titleId} style={{ margin: 0, fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {Icon && <Icon size={20} color={COLORS.gold} />} {title}
              </h3>
              {onClose && (
                <button type="button" onClick={requestClose} aria-label="إغلاق" className="modal-close-btn">
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
