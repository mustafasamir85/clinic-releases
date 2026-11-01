import { createContext, useCallback, useContext, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';

// نافذة تأكيد بتصميم التطبيق بدل window.confirm. الاستخدام:
//   const confirm = useConfirm();
//   if (!(await confirm({ title, message, confirmLabel, cancelLabel, danger }))) return;
// danger: إجراء مدمّر → زر أحمر ويبدأ التركيز على «إلغاء» كي لا يؤكَّد بالخطأ بمفتاح Enter.

// خارج المزوّد (اختبارات مثلاً) نرجع إلى نافذة المتصفح بدل أن ينكسر شيء
const fallbackConfirm = (options) => Promise.resolve(window.confirm(typeof options === 'string' ? options : options?.message ?? ''));
const ConfirmContext = createContext(fallbackConfirm);

export const useConfirm = () => useContext(ConfirmContext);

function ConfirmDialog({ options, onResult }) {
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();
  const { title = 'تأكيد الإجراء', message, confirmLabel = 'تأكيد', cancelLabel = 'إلغاء', danger = false } = options;
  const Icon = danger ? AlertTriangle : HelpCircle;

  useDialog(ref, { onEscape: () => onResult(false), initialFocus: danger ? '[data-confirm-cancel]' : '[data-confirm-ok]' });

  return createPortal(
    <div className="warm-overlay confirm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onResult(false); }}>
      <div ref={ref} tabIndex={-1} className="warm-modal confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} style={{ maxWidth: 440 }}>
        <div className="confirm-head">
          <span className={`confirm-icon ${danger ? 'danger' : ''}`}><Icon size={22} /></span>
          <h3 id={titleId}>{title}</h3>
        </div>
        <p id={descId} className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="btn-confirm-cancel" data-confirm-cancel onClick={() => onResult(false)}>{cancelLabel}</button>
          <button type="button" className={danger ? 'btn-confirm-danger' : 'btn-warm-primary'} data-confirm-ok onClick={() => onResult(true)}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ConfirmProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const active = useRef(null);
  const queue = useRef([]);
  const counter = useRef(0);

  const confirm = useCallback((options) => new Promise((resolve) => {
    counter.current += 1;
    const item = { id: counter.current, options: typeof options === 'string' ? { message: options } : options, resolve };
    if (active.current) {
      queue.current.push(item); // طلب جديد أثناء عرض آخر: ينتظر دوره
    } else {
      active.current = item;
      setCurrent(item);
    }
  }), []);

  const settle = useCallback((value) => {
    const item = active.current;
    if (!item) return;
    item.resolve(value);
    const next = queue.current.shift() ?? null;
    active.current = next;
    setCurrent(next);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {current && <ConfirmDialog key={current.id} options={current.options} onResult={settle} />}
    </ConfirmContext.Provider>
  );
}
