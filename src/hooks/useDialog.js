import { useEffect, useRef } from 'react';

// سلوك موحّد لكل نافذة (منبثقة أو تأكيد): تركيز تلقائي، حبس Tab داخلها، Escape للنافذة العليا فقط،
// وإعادة التركيز للعنصر الذي فتحها عند الإغلاق. المكدّس يمنع إغلاق نافذتين معاً بضغطة Escape واحدة
// (مثلاً نافذة تأكيد فوق نموذج).
const stack = [];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const FIELD = 'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), select:not([disabled]), textarea:not([disabled])';

const getFocusable = (node) => [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);

// initialFocus: محدّد CSS للعنصر الأولي (افتراضياً أول حقل إدخال، وإلا النافذة نفسها)
export function useDialog(ref, { onEscape, initialFocus } = {}) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const token = {};
    stack.push(token);
    const previous = document.activeElement;

    // إن كان داخلها عنصر أخذ التركيز بنفسه (autoFocus) نتركه
    if (!node.contains(document.activeElement)) {
      const target = (initialFocus && node.querySelector(initialFocus)) || node.querySelector(FIELD);
      (target ?? node).focus({ preventScroll: true });
    }

    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return;
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return; // عنصر داخلي (قائمة اقتراحات مثلاً) استهلك المفتاح
        escapeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusable(node);
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !node.contains(active) || active === node;
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      if (previous && previous !== document.body && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [ref, initialFocus]);
}
