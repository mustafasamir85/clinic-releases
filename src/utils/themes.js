// تعريف الثيمات الجاهزة وقائمة الألوان القابلة للتخصيص، وتحويل (ثيم + وضع + تعديلات المستخدم) إلى متغيّرات CSS.
import { bestOn, contrast, derivePalette, isDarkColor, mix, rgba } from './themeColors';

// ---------------------------------------------------------------------------------------------
// الألوان القابلة للتخصيص. key = مفتاح التخزين، cssVar = المتغيّر الذي يُكتب على <html>.
// check: فحص التباين — هذا اللون نصٌّ/أيقونة فوق الألوان المذكورة في against (الحد الأدنى min).
// brand بلا متغيّر CSS خاص به: تغييره يعيد اشتقاق الأزرار والتمييز والتوهّج معاً.
// ---------------------------------------------------------------------------------------------
export const TOKEN_GROUPS = [
  {
    id: 'base',
    label: 'الألوان الأساسية',
    note: 'تغيير أيٍّ منها يُعيد اشتقاق بقية الألوان تلقائياً (إلا ما عدّلته يدوياً).',
    tokens: [
      { key: 'bg', cssVar: '--c-bg', label: 'خلفية الصفحة', hint: 'الخلفية العامة خلف كل شيء' },
      { key: 'card', cssVar: '--c-card', label: 'البطاقات', hint: 'البطاقات والنوافذ والجداول' },
      { key: 'brand', label: 'اللون الرئيسي', hint: 'لون العلامة: الأزرار والتمييز والتوهّج' },
    ],
  },
  {
    id: 'surfaces',
    label: 'الأسطح والحدود',
    tokens: [
      { key: 'surface', cssVar: '--c-surface', label: 'الترويسة واللوحات', hint: 'الترويسة والقائمة الجانبية واللوحات المنبثقة' },
      { key: 'inset', cssVar: '--c-inset', label: 'الحقول والصناديق الغائرة', hint: 'حقول الإدخال والصفوف داخل البطاقات' },
      { key: 'soft', cssVar: '--c-soft', label: 'الأزرار الثانوية والتحديد', hint: 'الأزرار الثانوية، التمرير فوق العناصر' },
      { key: 'border', cssVar: '--c-border', label: 'الحدود والفواصل', hint: 'حدود البطاقات والحقول وأشرطة التمرير' },
      { key: 'neutralBg', cssVar: '--c-neutral-bg', label: 'الشارات المحايدة', hint: 'خلفية الشارات والوسوم الرمادية' },
    ],
  },
  {
    id: 'text',
    label: 'النصوص',
    tokens: [
      { key: 'ink', cssVar: '--c-ink', label: 'العناوين', hint: 'العناوين والنص الأهم', check: { against: ['card', 'bg'], min: 4.5 } },
      { key: 'text', cssVar: '--c-text', label: 'النص العادي', hint: 'نصوص الفقرات والجداول', check: { against: ['card', 'bg'], min: 4.5 } },
      { key: 'muted', cssVar: '--c-muted', label: 'النص الثانوي', hint: 'الأوصاف والتسميات الصغيرة', check: { against: ['card', 'bg'], min: 4.5 } },
      { key: 'faint', cssVar: '--c-faint', label: 'النص الباهت', hint: 'التلميحات والنص التوضيحي', check: { against: ['card', 'bg'], min: 4.5 } },
    ],
  },
  {
    id: 'accent',
    label: 'التمييز والأزرار',
    tokens: [
      { key: 'accent', cssVar: '--c-accent', label: 'نصوص وأيقونات مميّزة', hint: 'الروابط الداخلية والأيقونات والعناصر النشطة', check: { against: ['card', 'bg'], min: 3 } },
      { key: 'btn1', cssVar: '--c-btn-1', label: 'تعبئة الأزرار (البداية)', hint: 'بداية تدرّج الأزرار الرئيسية' },
      { key: 'btn2', cssVar: '--c-btn-2', label: 'تعبئة الأزرار (النهاية)', hint: 'نهاية تدرّج الأزرار — اجعلها مساوية للبداية لزر مسطّح' },
      { key: 'onBtn', cssVar: '--c-on-btn', label: 'نص الأزرار', hint: 'النص فوق الأزرار الرئيسية', check: { against: ['btn1', 'btn2'], min: 4.5 } },
      { key: 'primary', cssVar: '--c-primary', label: 'اللون الداكن للشارات', hint: 'رؤوس الجداول والإشعارات والشارات الداكنة' },
      { key: 'onPrimary', cssVar: '--c-on-primary', label: 'نص فوق اللون الداكن', hint: 'نص الإشعارات ورؤوس الجداول', check: { against: ['primary'], min: 4.5 } },
      { key: 'link', cssVar: '--c-link', label: 'الروابط', hint: 'روابط النص', check: { against: ['card'], min: 4.5 } },
    ],
  },
  {
    id: 'status',
    label: 'ألوان الحالات',
    tokens: [
      { key: 'success', cssVar: '--c-success', label: 'نجاح (أزرار)', hint: 'تعبئة أزرار التأكيد والحفظ' },
      { key: 'successBg', cssVar: '--c-success-bg', label: 'نجاح (خلفية)', hint: 'خلفية شارات الحالة الناجحة' },
      { key: 'successText', cssVar: '--c-success-text', label: 'نجاح (نص)', hint: 'نص الحالة الناجحة', check: { against: ['successBg'], min: 4.5 } },
      { key: 'danger', cssVar: '--c-danger', label: 'خطر (أزرار)', hint: 'حذف وتنبيهات خطيرة' },
      { key: 'dangerBg', cssVar: '--c-danger-bg', label: 'خطر (خلفية)', hint: 'خلفية رسائل الخطأ' },
      { key: 'dangerText', cssVar: '--c-danger-text', label: 'خطر (نص)', hint: 'نص الأخطاء', check: { against: ['dangerBg'], min: 4.5 } },
      { key: 'onDanger', cssVar: '--c-on-danger', label: 'نص أزرار الخطر', hint: 'النص فوق زر الحذف', check: { against: ['danger'], min: 4.5 } },
      { key: 'warnBg', cssVar: '--c-warn-bg', label: 'تحذير (خلفية)', hint: 'خلفية التنبيهات' },
      { key: 'warnText', cssVar: '--c-warn-text', label: 'تحذير (نص)', hint: 'نص التنبيهات', check: { against: ['warnBg'], min: 4.5 } },
    ],
  },
  {
    id: 'effects',
    label: 'التأثيرات',
    tokens: [{ key: 'glow', cssVar: '--c-glow', label: 'توهّج الخلفية', hint: 'التوهّج الملوّن الخفيف في زوايا الصفحة' }],
  },
];

export const ALL_TOKENS = TOKEN_GROUPS.flatMap((g) => g.tokens);
export const TOKEN_KEYS = ALL_TOKENS.map((t) => t.key);
const TOKEN_BY_KEY = Object.fromEntries(ALL_TOKENS.map((t) => [t.key, t]));

export const HEX = /^#[0-9a-f]{6}$/i;

// ---------------------------------------------------------------------------------------------
// الثيمات الجاهزة: لكل ثيم نسخة داكنة وفاتحة تتبدّلان مع وضع الألوان.
// bg/card/brand أساسية، و brand2 اختياري (نهاية تدرّج الأزرار).
// ---------------------------------------------------------------------------------------------
export const THEMES = [
  {
    id: 'teal', name: 'فيروز',
    dark: { bg: '#071a1d', card: '#0e2a2f', brand: '#2dd4bf', brand2: '#38bdf8' },
    light: { bg: '#e9f5f4', card: '#ffffff', brand: '#0d9488', brand2: '#0891b2' },
  },
  {
    id: 'aurora', name: 'أورورا',
    dark: { bg: '#0b1020', card: '#141b34', brand: '#818cf8', brand2: '#a78bfa' },
    light: { bg: '#f1f3fb', card: '#ffffff', brand: '#4f46e5', brand2: '#7c3aed' },
  },
  {
    id: 'ocean', name: 'محيط',
    dark: { bg: '#061823', card: '#0c2735', brand: '#38bdf8', brand2: '#22d3ee' },
    light: { bg: '#e8f3fa', card: '#ffffff', brand: '#0369a1', brand2: '#0e7490' },
  },
  {
    id: 'emerald', name: 'زمرّد',
    dark: { bg: '#07130f', card: '#0e221b', brand: '#34d399', brand2: '#a3e635' },
    light: { bg: '#ecf7f1', card: '#ffffff', brand: '#059669', brand2: '#65a30d' },
  },
  {
    id: 'sunset', name: 'غروب',
    dark: { bg: '#170c12', card: '#251520', brand: '#fb7185', brand2: '#fb923c' },
    light: { bg: '#fdf1ef', card: '#ffffff', brand: '#e11d48', brand2: '#c2410c' },
  },
  {
    id: 'amber', name: 'كهرمان',
    dark: { bg: '#14110b', card: '#211d13', brand: '#fbbf24', brand2: '#f97316' },
    light: { bg: '#f9f3e4', card: '#fffdf7', brand: '#f59e0b', brand2: '#f97316' },
  },
  {
    id: 'orchid', name: 'أوركيد',
    dark: { bg: '#150b1d', card: '#221431', brand: '#e879f9', brand2: '#a78bfa' },
    light: { bg: '#f7eefb', card: '#ffffff', brand: '#a21caf', brand2: '#7c3aed' },
  },
  {
    id: 'lime', name: 'غرافيت وليموني',
    dark: { bg: '#0d0e10', card: '#17191c', brand: '#a3e635', brand2: '#4ade80' },
    light: { bg: '#f2f3f1', card: '#ffffff', brand: '#84cc16', brand2: '#65a30d' },
  },
  {
    id: 'sand', name: 'رمل وطين',
    dark: { bg: '#181310', card: '#27201a', brand: '#fb923c', brand2: '#f59e0b' },
    light: { bg: '#f5efe6', card: '#fffcf7', brand: '#c2410c', brand2: '#b45309' },
  },
  {
    id: 'classic', name: 'العيادة الكلاسيكي',
    dark: { bg: '#0a2a2e', card: '#14424a', brand: '#ffb48a', brand2: '#ff9d6c' },
    light: { bg: '#c9ecea', card: '#eefaf8', brand: '#ffb48a', brand2: '#ff9d6c' },
  },
];

export const DEFAULT_THEME_ID = 'teal';
export const findTheme = (id) => THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID);

// ---------------------------------------------------------------------------------------------
// الحل النهائي: (ثيم + وضع + تعديلات) ← قيم hex لكل لون + قيم متغيّرات CSS جاهزة للكتابة
// overrides: { [key]: '#rrggbb' } — لا تُخزَّن إلا الألوان التي عدّلها المستخدم صراحةً
// ---------------------------------------------------------------------------------------------
export function resolveTheme(themeId, mode, overrides = {}) {
  const fam = findTheme(themeId)[mode === 'light' ? 'light' : 'dark'];
  const o = Object.fromEntries(Object.entries(overrides).filter(([k, v]) => TOKEN_BY_KEY[k] && HEX.test(v)));

  // تعديل اللون الرئيسي يلغي تدرّج الثيم الجاهز (brand2) كي لا يبقى لون قديم في نهاية التدرّج
  const base = { bg: o.bg ?? fam.bg, card: o.card ?? fam.card, brand: o.brand ?? fam.brand, brand2: o.brand ? undefined : fam.brand2 };
  const tokens = { ...derivePalette(base) };
  Object.entries(o).forEach(([k, v]) => { tokens[k] = v.toLowerCase(); });
  tokens.brand = base.brand.toLowerCase();

  // ألوان النصوص فوق تعبئات: تبقى مقروءة تلقائياً إن عدّل المستخدم التعبئة ولم يعدّل النص نفسه
  if (!o.onBtn) tokens.onBtn = bestOn([tokens.btn1, tokens.btn2]);
  if (!o.onPrimary) tokens.onPrimary = bestOn(tokens.primary, '#f8fafc', '#10131a');
  if (!o.onDanger) tokens.onDanger = bestOn(tokens.danger, '#ffffff', '#2a0a0a');

  const dark = isDarkColor(tokens.bg);
  const css = {};
  ALL_TOKENS.forEach((t) => { if (t.cssVar) css[t.cssVar] = tokens[t.key]; });
  css['--c-accent-soft'] = rgba(tokens.accent, dark ? 0.1 : 0.12);
  css['--c-ring'] = rgba(tokens.accent, 0.3);
  css['--c-glow'] = rgba(tokens.glow, dark ? 0.12 : 0.16);
  css['--overlay'] = rgba(mix(tokens.bg, '#000000', dark ? 0.8 : 0.85), dark ? 0.65 : 0.45);
  return { tokens, css, dark };
}

// فحص التباين لكل لون له check: يعيد { ratio, min, ok } أو null
export function contrastReport(tokens, key) {
  const check = TOKEN_BY_KEY[key]?.check;
  if (!check) return null;
  const ratio = Math.min(...check.against.map((k) => contrast(tokens[key], tokens[k])));
  return { ratio, min: check.min, ok: ratio >= check.min };
}

export const tokenLabel = (key) => TOKEN_BY_KEY[key]?.label ?? key;

// تنظيف تعديلات قادمة من التخزين أو الاستيراد: مفاتيح معروفة وقيم hex صالحة فقط
export function sanitizeOverrides(value) {
  const out = {};
  if (!value || typeof value !== 'object') return out;
  Object.entries(value).forEach(([k, v]) => {
    if (TOKEN_BY_KEY[k] && typeof v === 'string' && HEX.test(v)) out[k] = v.toLowerCase();
  });
  return out;
}
