// أدوات الألوان + اشتقاق باليت كامل (≈29 لوناً) من ثلاثة ألوان أساسية: الخلفية والبطاقات واللون الرئيسي.
// الباليت يُكتب على <html> كمتغيّرات CSS (انظر useTheme)، وللمستخدم تعديل أي لون منها منفرداً.

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

export function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}

export function hslToHex([h, s, l]) {
  const sat = clamp(s, 0, 100) / 100;
  const lig = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const tint = (h, s, l) => hslToHex([h, s, clamp(l, 0, 100)]);
const worstContrast = (color, against) => Math.min(...against.map((a) => contrast(color, a)));

// هل اللون "داكن" بحيث يلزمه نص فاتح؟ (النقطة التي يتساوى عندها تباين الأبيض والأسود)
export const isDarkColor = (hex) => contrast(hex, '#ffffff') >= contrast(hex, '#000000');

// مزج لونين: t=0 → a ، t=1 → b
export function mix(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

export const rgba = (hex, alpha) => `rgba(${hexToRgb(hex).join(', ')}, ${alpha})`;

// أفضل لون نص (داكن أو فاتح) فوق مجموعة تعبئات: يُختار الأعلى تبايناً في أسوأ الأحوال
export function bestOn(fills, light = '#ffffff', dark = '#10131a') {
  const list = Array.isArray(fills) ? fills : [fills];
  return worstContrast(dark, list) >= worstContrast(light, list) ? dark : light;
}

// يحرّك درجة السطوع (للأعلى على الخلفيات الداكنة، وللأسفل على الفاتحة) حتى يبلغ التباين المطلوب
function readableTone(h, s, dark, startL, against, min) {
  let l = startL;
  let color = tint(h, s, l);
  for (let i = 0; i < 70 && worstContrast(color, against) < min; i += 1) {
    l = clamp(l + (dark ? 1.5 : -1.5), 0, 100);
    color = tint(h, s, l);
  }
  return color;
}

// ألوان الحالات (نجاح/خطر/تحذير) مضبوطة يدوياً لكل اتجاه، وخلفياتها تُمزج مع لون البطاقة فتنسجم مع أي ثيم
const STATUS = {
  dark: {
    danger: '#f87171', dangerText: '#fca5a5', onDanger: '#2a0a0a', dangerMix: ['#ef4444', 0.2],
    success: '#047857', successText: '#6ee7b7', successMix: ['#10b981', 0.2],
    warnText: '#fcd34d', warnMix: ['#f59e0b', 0.2],
    link: '#82b8ff',
  },
  light: {
    danger: '#dc2626', dangerText: '#b91c1c', onDanger: '#ffffff', dangerMix: ['#ef4444', 0.14],
    success: '#047857', successText: '#065f46', successMix: ['#10b981', 0.16],
    warnText: '#8a4b0f', warnMix: ['#f59e0b', 0.2],
    link: '#1d4ed8',
  },
};

// يشتق الباليت الكامل (قيم hex) من الألوان الأساسية.
// base: { bg, card, brand, brand2? } — brand: اللون الرئيسي (تعبئة الأزرار) ، brand2: نهاية تدرّج الأزرار (اختياري)
// الاتجاه (داكن/فاتح) يُحسم من لون الخلفية نفسه، فيبقى النص مقروءاً حتى لو اختار المستخدم خلفية تخالف الوضع.
export function derivePalette(base) {
  const bg = rgbToHex(hexToRgb(base.bg));
  const card = rgbToHex(hexToRgb(base.card));
  const brand = rgbToHex(hexToRgb(base.brand));
  const dark = isDarkColor(bg);
  const st = STATUS[dark ? 'dark' : 'light'];

  // بطاقة تخالف الخلفية سطوعاً (فاتحة فوق داكنة مثلاً): تبقى اللوحات قريبة من الخلفية لا من البطاقة
  const surface = mix(bg, card, isDarkColor(card) === dark ? 0.5 : 0.12);
  const inset = dark ? mix(card, '#000000', 0.32) : mix(card, '#000000', 0.04);
  const soft = dark ? mix(card, '#ffffff', 0.08) : mix(card, '#000000', 0.065);
  const border = dark ? mix(card, '#ffffff', 0.15) : mix(card, '#000000', 0.13);
  const readOn = [bg, surface, card, inset, soft];

  // نصوص بصبغة الخلفية دون تشبّع زائد
  const [h, s] = hexToHsl(bg);
  const ts = clamp(s, 10, 35);
  const ink = readableTone(h, ts, dark, dark ? 95 : 10, readOn, 9);
  const text = readableTone(h, ts, dark, dark ? 84 : 20, readOn, 7);
  const muted = readableTone(h, ts, dark, dark ? 74 : 34, readOn, 4.8);
  const faint = readableTone(h, ts, dark, dark ? 68 : 40, readOn, 4.5);

  // لون التمييز للنصوص والأيقونات: لون العلامة نفسه إن كان مقروءاً، وإلا يُعدَّل بالقدر اللازم فقط
  const [bh, bs, bl] = hexToHsl(brand);
  const surfaces = [bg, surface, card, inset];
  let accent = brand;
  let al = bl;
  for (let i = 0; i < 70 && worstContrast(accent, surfaces) < 4.5; i += 1) {
    al = clamp(al + (dark ? 1.5 : -1.5), 0, 100);
    accent = hslToHex([bh, bs, al]);
  }

  const btn2 = base.brand2 ? rgbToHex(hexToRgb(base.brand2)) : hslToHex([(bh + 22) % 360, clamp(bs, 0, 100), clamp(bl + (bl > 50 ? -7 : 6), 0, 100)]);
  const primary = dark ? mix(card, brand, 0.3) : hslToHex([bh, clamp(bs, 28, 60), 24]);

  const dangerBg = mix(card, ...st.dangerMix);
  const successBg = mix(card, ...st.successMix);
  const warnBg = mix(card, ...st.warnMix);

  return {
    bg, surface, card, inset, soft, border, neutralBg: soft,
    ink, text, muted, faint,
    accent, btn1: brand, btn2, onBtn: bestOn([brand, btn2]),
    primary, onPrimary: bestOn(primary, '#f8fafc', '#10131a'), link: st.link,
    success: st.success, successBg, successText: st.successText,
    danger: st.danger, dangerBg, dangerText: st.dangerText, onDanger: st.onDanger,
    warnBg, warnText: st.warnText,
    glow: brand,
  };
}

// لون البطاقات: يُطبَّق كما اختاره المستخدم تماماً على --c-card.
// البطاقة قد تخالف الخلفية في الفاتح/الداكن (بطاقة فاتحة فوق خلفية داكنة مثلاً)، فلا يصلح معها نفس ألوان النصوص العامة؛
// لذلك تُولَّد قيم نصوص وطبقات خاصة تسري داخل البطاقات فقط (انظر CARD_SELECTORS)، وتبقى الصفحة على ألوانها.
export const CARD_SELECTORS = '.warm-card, .panel-box, .report-table-card, .report-chart-card';

// ألوان نصية تُعدَّل داخل البطاقة فقط إن ضعف تباينها مع لونها
const CARD_READABLE_VARS = ['--c-accent', '--c-danger', '--c-danger-text', '--c-success-text', '--c-warn-text', '--c-link'];
const HEX6 = /^#[0-9a-f]{6}$/i;

// readVar(name): يعيد القيمة الحالية لمتغيّر على <html> (لقراءة الألوان الأساسية قبل تعديلها)
export function buildCardVars(hex, readVar = () => '') {
  const card = rgbToHex(hexToRgb(hex));
  const [h, s, l] = hexToHsl(card);
  const dark = isDarkColor(card);
  const layer = (dl) => tint(h, s, l + dl);

  const inset = layer(-8);
  const surface = layer(-4);
  const soft = dark ? layer(8) : layer(-14);
  const border = dark ? layer(14) : layer(-22);
  const readOn = [card, inset, surface];
  const ts = clamp(s, 10, 35);

  const scope = {
    '--c-inset': inset, '--c-surface': surface, '--c-soft': soft, '--c-border': border, '--c-neutral-bg': soft,
    '--c-ink': readableTone(h, ts, dark, dark ? 95 : 12, readOn, 9),
    '--c-text': readableTone(h, ts, dark, dark ? 84 : 22, readOn, 7),
    '--c-muted': readableTone(h, ts, dark, dark ? 74 : 34, readOn, 4.8),
    '--c-faint': readableTone(h, ts, dark, dark ? 68 : 40, readOn, 4.5),
  };

  // ألوان التمييز والحالات (نص/أيقونات): تبقى كما هي إن كانت مقروءة على البطاقة، وإلا تُعدَّل بالقدر اللازم
  CARD_READABLE_VARS.forEach((name) => {
    const base = String(readVar(name)).trim();
    if (!HEX6.test(base) || worstContrast(base, readOn) >= 3) return;
    const [bh, bs, bl] = hexToHsl(base);
    let tl = bl;
    let fixed = base;
    for (let i = 0; i < 70 && worstContrast(fixed, readOn) < 4.5; i += 1) {
      tl = clamp(tl + (dark ? 1.5 : -1.5), 0, 100);
      fixed = hslToHex([bh, bs, tl]);
    }
    scope[name] = fixed;
    if (name === '--c-accent') {
      const [r, g, b] = hexToRgb(fixed);
      scope['--c-accent-soft'] = `rgba(${r}, ${g}, ${b}, ${dark ? 0.1 : 0.12})`;
      scope['--c-ring'] = `rgba(${r}, ${g}, ${b}, 0.3)`;
    }
  });

  return { root: { '--c-card': card }, scope };
}
