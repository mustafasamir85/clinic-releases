import { useCallback, useEffect, useState } from 'react';

// تفضيلات العرض: حجم الخط وكثافة العرض (مريح / مضغوط). تُحفظ في هذا المتصفح لكل جهاز.
// حجم الخط يُطبَّق بخاصية CSS zoom على <html> لأن أحجام الواجهة مكتوبة بالبكسل (لا rem)،
// فيكبّر كل شيء معاً: النص والحقول والمسافات. الطباعة تتجاهله (انظر App.css).
const KEY = 'clinic-display-prefs';

export const FONT_SIZES = [
  { id: 'sm', label: 'صغير', scale: 0.92 },
  { id: 'md', label: 'عادي', scale: 1 },
  { id: 'lg', label: 'كبير', scale: 1.12 },
  { id: 'xl', label: 'كبير جداً', scale: 1.25 },
];

export const DEFAULT_DISPLAY = { font: 'md', compact: false };

// zoom معياري في المتصفحات الحديثة؛ إن لم يُدعَم نُخفي خيار الحجم بدل أن يبدو معطّلاً
export const supportsZoom = () => typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('zoom', '1.1');

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return {
      font: FONT_SIZES.some((f) => f.id === v?.font) ? v.font : DEFAULT_DISPLAY.font,
      compact: v?.compact === true,
    };
  } catch {
    return DEFAULT_DISPLAY;
  }
};

export function useDisplayPrefs() {
  const [display, setDisplayState] = useState(read);

  useEffect(() => {
    const root = document.documentElement;
    const scale = supportsZoom() ? FONT_SIZES.find((f) => f.id === display.font)?.scale ?? 1 : 1;
    // --ui-zoom يُستعمل في App.css لتصحيح وحدات vh (التي يكبّرها zoom أيضاً)
    root.style.setProperty('--ui-zoom', String(scale));
    if (scale === 1) root.style.removeProperty('zoom');
    else root.style.setProperty('zoom', String(scale));
    if (display.compact) root.dataset.density = 'compact';
    else delete root.dataset.density;
  }, [display]);

  // changes: { font?, compact? }؛ بلا وسيط تُعاد القيم الافتراضية
  const setDisplay = useCallback((changes) => {
    setDisplayState((current) => {
      const next = changes ? { ...current, ...changes } : DEFAULT_DISPLAY;
      try {
        if (next.font === DEFAULT_DISPLAY.font && !next.compact) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* التخزين غير متاح */
      }
      return next;
    });
  }, []);

  return [display, setDisplay];
}
