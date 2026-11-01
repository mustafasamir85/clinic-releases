import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildCardVars, CARD_SELECTORS, isDarkColor } from '../utils/themeColors';
import { ALL_TOKENS, DEFAULT_THEME_ID, findTheme, HEX, resolveTheme, sanitizeOverrides, THEMES } from '../utils/themes';

// مفتاح جديد: نسخة سابقة كانت تحفظ الوضع تلقائياً عند أول تشغيل (فاتح)،
// فيبقى الفاتح عالقاً عند بعض المستخدمين. المفتاح الجديد لا يحمل إلا اختياراً صريحاً.
const STORAGE_KEY = 'clinic-theme-choice'; // 'light' | 'dark' | 'system' (اتباع إعداد النظام)
const THEME_KEY = 'clinic-theme-v2'; // { id, overrides: { dark: {...}, light: {...} } } — الثيم المختار وتعديلات المستخدم لكل وضع
const LEGACY_COLORS_KEY = 'clinic-theme-colors'; // النظام القديم: { bg, accent, card } — يُحوَّل تلقائياً عند أول تشغيل
const SCOPE_STYLE_ID = 'theme-card-scope';

// قراءة آمنة: المتصفح قد يمنع localStorage (وضع خاص مثلاً)
const readStored = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const EMPTY = { dark: {}, light: {} };

const readCustom = () => {
  const v = parseJson(readStored(THEME_KEY));
  if (v && typeof v === 'object') {
    return {
      id: THEMES.some((t) => t.id === v.id) ? v.id : DEFAULT_THEME_ID,
      overrides: { dark: sanitizeOverrides(v.overrides?.dark), light: sanitizeOverrides(v.overrides?.light) },
    };
  }
  // ترحيل الألوان الثلاثة القديمة: الواجهة القديمة ← اللون الرئيسي
  const old = parseJson(readStored(LEGACY_COLORS_KEY));
  if (old && typeof old === 'object') {
    const migrated = sanitizeOverrides({ bg: old.bg, card: old.card, brand: old.accent });
    return { id: DEFAULT_THEME_ID, overrides: { dark: migrated, light: migrated } };
  }
  return { id: DEFAULT_THEME_ID, overrides: EMPTY };
};

const saveCustom = (custom) => {
  try {
    const empty = !Object.keys(custom.overrides.dark).length && !Object.keys(custom.overrides.light).length;
    if (empty && custom.id === DEFAULT_THEME_ID) localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, JSON.stringify(custom));
    localStorage.removeItem(LEGACY_COLORS_KEY);
  } catch {
    /* التخزين غير متاح — لا مشكلة */
  }
};

// الوضع الداكن هو الافتراضي (أريح للعين) ما لم يختر المستخدم غيره صراحةً.
// 'system' يتبع إعداد الجهاز (prefers-color-scheme) ويتغيّر تلقائياً معه.
const initialMode = () => {
  const stored = readStored(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
};

const systemQuery = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

// كل المتغيّرات التي قد نكتبها على <html> (لتنظيفها قبل كل تطبيق)
const ALL_VARS = [...ALL_TOKENS.map((t) => t.cssVar).filter(Boolean), '--c-accent-soft', '--c-ring', '--overlay'];
const VAR_BY_KEY = Object.fromEntries(ALL_TOKENS.filter((t) => t.cssVar).map((t) => [t.key, t.cssVar]));

export function useTheme() {
  const [mode, setModeState] = useState(initialMode); // اختيار المستخدم: light | dark | system
  const [systemDark, setSystemDark] = useState(() => systemQuery()?.matches ?? true);
  const [custom, setCustomState] = useState(readCustom); // { id, overrides: { dark, light } }

  // الوضع الفعلي المطبَّق: عند 'system' يتبع الجهاز، وإلا اختيار المستخدم
  const theme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
  const overrides = custom.overrides[theme];

  // الباليت الكامل للوضع الحالي (قيم hex لكل لون + متغيّرات CSS)
  const resolved = useMemo(() => resolveTheme(custom.id, theme, overrides), [custom.id, theme, overrides]);

  // متابعة تغيّر إعداد النظام أثناء عمل التطبيق (مثلاً جدولة الوضع الليلي في الجهاز)
  useEffect(() => {
    const query = systemQuery();
    if (!query) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // تطبيق الوضع على <html> (يُقرأ في App.css عبر data-theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // كتابة الباليت على <html>؛ تُعاد عند تبديل الوضع أو الثيم أو أي تعديل
  useEffect(() => {
    const root = document.documentElement;
    ALL_VARS.forEach((v) => root.style.removeProperty(v));
    Object.entries(resolved.css).forEach(([k, v]) => root.style.setProperty(k, v));
    // حقول الإدخال وأشرطة التمرير الأصلية تتبع سطوع الخلفية الفعلي
    root.style.setProperty('color-scheme', resolved.dark ? 'dark' : 'light');

    // بطاقة تخالف الخلفية سطوعاً (مثلاً بطاقة فاتحة فوق خلفية داكنة): نصوص وطبقات خاصة تسري داخل البطاقات فقط
    // (للشاشة لا للطباعة)، ولا تمسّ الألوان التي عدّلها المستخدم يدوياً
    let styleEl = document.getElementById(SCOPE_STYLE_ID);
    if (isDarkColor(resolved.tokens.card) !== resolved.dark) {
      const cs = getComputedStyle(root);
      const { scope } = buildCardVars(resolved.tokens.card, (name) => cs.getPropertyValue(name));
      const userVars = new Set(Object.keys(overrides).map((k) => VAR_BY_KEY[k]).filter(Boolean));
      const decls = Object.entries(scope)
        .filter(([k]) => !userVars.has(k))
        .map(([k, v]) => `${k}: ${v};`)
        .join(' ');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = SCOPE_STYLE_ID;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `@media screen { ${CARD_SELECTORS} { ${decls} } }`;
    } else if (styleEl) {
      styleEl.remove();
    }
  }, [resolved, overrides]);

  // الحفظ يتم عند الاختيار الصريح فقط، فلا يُثبَّت الافتراضي كأنه اختيار
  const setMode = useCallback((next) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* التخزين غير متاح — لا مشكلة */
    }
  }, []);

  // زر الشمس/القمر: يقلب الوضع الظاهر حالياً إلى عكسه (ويصبح اختياراً صريحاً حتى لو كان «تلقائي»)
  const toggle = useCallback(() => setMode(theme === 'dark' ? 'light' : 'dark'), [theme, setMode]);

  const update = useCallback((fn) => {
    setCustomState((current) => {
      const next = fn(current);
      saveCustom(next);
      return next;
    });
  }, []);

  // اختيار ثيم جاهز: يستبدل تعديلات المستخدم السابقة (يمكن تصديرها قبل ذلك)
  const setThemeId = useCallback((id) => {
    if (!THEMES.some((t) => t.id === id)) return;
    update(() => ({ id, overrides: EMPTY }));
  }, [update]);

  // تعديل لون واحد في الوضع الحالي؛ null يعيده إلى لون الثيم
  const setToken = useCallback((key, value) => {
    if (!ALL_TOKENS.some((t) => t.key === key)) return;
    update((cur) => {
      const mine = { ...cur.overrides[theme] };
      if (value && HEX.test(value)) mine[key] = value.toLowerCase();
      else delete mine[key];
      return { ...cur, overrides: { ...cur.overrides, [theme]: mine } };
    });
  }, [update, theme]);

  // إلغاء كل تعديلات الوضع الحالي والعودة إلى ألوان الثيم
  const resetTokens = useCallback(() => {
    update((cur) => ({ ...cur, overrides: { ...cur.overrides, [theme]: {} } }));
  }, [update, theme]);

  // تصدير الثيم الحالي (الاختيار + التعديلات في الوضعين) كنص JSON للنسخ أو المشاركة
  const exportTheme = useCallback(
    () => JSON.stringify({ v: 1, theme: custom.id, overrides: custom.overrides }, null, 2),
    [custom],
  );

  // استيراد نص JSON سبق تصديره؛ يعيد { ok, error? }
  const importTheme = useCallback((text) => {
    const data = parseJson(text);
    if (!data || typeof data !== 'object' || !THEMES.some((t) => t.id === data.theme)) {
      return { ok: false, error: 'نص غير صالح: تأكد من نسخ الثيم كاملاً.' };
    }
    update(() => ({ id: data.theme, overrides: { dark: sanitizeOverrides(data.overrides?.dark), light: sanitizeOverrides(data.overrides?.light) } }));
    return { ok: true };
  }, [update]);

  return {
    theme, mode, setMode, toggle,
    themeId: custom.id, themeName: findTheme(custom.id).name, setThemeId,
    tokens: resolved.tokens, overrides, setToken, resetTokens,
    exportTheme, importTheme,
  };
}
