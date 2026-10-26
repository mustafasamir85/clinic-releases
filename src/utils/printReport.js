import { ltr } from './phone';
import { CLINIC_ADDRESS, CLINIC_EMAIL, CLINIC_PHONES } from '../constants';
import { formatDateDMY, getToday } from './format';
import { getPrintUser } from './printUser';

// "طُبع بواسطة: المستخدم • التاريخ والوقت" — يُحسب لحظة الطباعة. فارغ إن لم يكن هناك مستخدم.
export function printedByLine(now = new Date()) {
  const user = getPrintUser();
  if (!user) return '';
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return `طُبع بواسطة: ${user} • ${formatDateDMY(getToday())} ${time}`;
}

// أجزاء التذييل: center = العنوان والهاتف/البريد (وسط الصفحة)، by = "طُبع بواسطة" (أسفل اليسار بخط صغير).
export function footerParts() {
  const phones = CLINIC_PHONES.filter(Boolean);
  const contact = [phones.length > 0 && `هاتف: ${phones.map(ltr).join(' / ')}`, CLINIC_EMAIL && `البريد الإلكتروني: ${ltr(CLINIC_EMAIL)}`].filter(Boolean).join('  •  ');
  return { center: [CLINIC_ADDRESS && `العنوان: ${CLINIC_ADDRESS}`, contact].filter(Boolean), by: printedByLine() };
}

// صناديق هوامش @page مدعومة في Chrome/Edge 131+؛ غيرها يستعمل التذييل داخل المستند (مرة في آخر الطباعة)
export function supportsPageMargins(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  const m = /(?:Chrome|Chromium|Edg)\/(\d+)/.exec(ua);
  return Boolean(m) && Number(m[1]) >= 131;
}

const hasFooter = (parts) => parts.center.length > 0 || Boolean(parts.by);
const CENTER_CHARS_PER_LINE = 52; // تقدير لعدد حروف السطر في صندوق الوسط (يلتف السطر الطويل)
const centerRows = (parts) => parts.center.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / CENTER_CHARS_PER_LINE)), 0);
const footerRows = (parts) => Math.max(centerRows(parts), parts.by ? 2 : 0);

// الهامش السفلي لصفحة الطباعة (مم): يتسع لصفوف التذييل إن كان في هامش الصفحة
export function bottomMarginMm(parts, marginBoxes) {
  return hasFooter(parts) && marginBoxes ? Math.min(40, 10 + 4.7 * footerRows(parts)) : 8;
}

const boxCss = (extra) => `white-space: pre-line; vertical-align: top; color: #111; border-top: 1px solid #111; padding-top: 2mm; ${extra}`;

export function pageCss(orientation, parts = footerParts(), marginBoxes = supportsPageMargins()) {
  let boxes = '';
  if (marginBoxes && parts.center.length > 0) {
    boxes += ` @bottom-center { content: ${parts.center.map((l) => JSON.stringify(l)).join(' "\\A" ')}; ${boxCss('width: 46%; font: 10.5px/1.7 sans-serif; text-align: center;')} }`;
  }
  if (marginBoxes && parts.by) {
    // أسفل اليسار بخط صغير (left فيزيائي: يبقى يساراً حتى في الصفحة العربية)
    boxes += ` @bottom-left { content: ${JSON.stringify(parts.by)}; ${boxCss('width: 27%; font: 7.5px/1.5 sans-serif; color: #444; text-align: left;')} }`;
  }
  // صندوق أيمن فارغ يُكمل خط الفاصل العلوي على عرض الصفحة كله
  if (boxes) boxes += ` @bottom-right { content: ""; ${boxCss('width: 27%;')} }`;
  return `@page { size: A4 ${orientation}; margin: 8mm 8mm ${bottomMarginMm(parts, marginBoxes)}mm 8mm;${boxes} }`;
}

const PAGE_MM = { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } };

// الارتفاع المتاح للمحتوى في صفحة A4 بعد الهوامش والتذييل (مم).
// في المتصفحات بلا دعم هوامش @page يُطبع التذييل داخل المستند، فنخصم ارتفاعه التقريبي أيضاً.
export function printableHeightMm(orientation = 'portrait', parts = footerParts(), marginBoxes = supportsPageMargins()) {
  const flowFooter = hasFooter(parts) && !marginBoxes ? 4.7 * footerRows(parts) + 10 : 0;
  return PAGE_MM[orientation].h - 8 - bottomMarginMm(parts, marginBoxes) - flowFooter - 4; // 4mm هامش أمان
}
export const portraitContentHeightMm = (parts, marginBoxes) => printableHeightMm('portrait', parts, marginBoxes);

// ===== الطباعة في صفحة واحدة =====
// تُجمَّع قواعد @media print وتُطبَّق مؤقتاً على الشاشة بعرض الصفحة المطبوعة لقياس ارتفاع المحتوى فعلاً،
// ثم يُصغَّر المحتوى (zoom) بالنسبة اللازمة ليتّسع في صفحة واحدة. أدنى نسبة تحفظ قابلية القراءة؛
// ما يحتاج أصغر منها ينتقل لصفحة ثانية بدل أن يصبح غير مقروء.
export const MIN_FIT_SCALE = 0.45;
const PX_PER_MM = 96 / 25.4;

function collectPrintCss() {
  let css = '';
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // ورقة أنماط من نطاق آخر
    }
    for (const rule of rules) {
      if (rule.type === CSSRule.MEDIA_RULE && /(^|[\s,])print([\s,]|$)/.test(rule.media.mediaText)) {
        css += [...rule.cssRules].map((r) => r.cssText).join('\n');
      }
    }
  }
  return css;
}

export function fitToOnePage(orientation, availableMm) {
  const style = document.createElement('style');
  style.textContent = collectPrintCss();
  document.head.appendChild(style);
  const targets = [document.documentElement, document.body];
  const props = ['width', 'min-width', 'max-width'];
  targets.forEach((el) => props.forEach((p) => el.style.setProperty(p, `${PAGE_MM[orientation].w - 16}mm`, 'important')));
  const availablePx = availableMm * PX_PER_MM * 0.98;
  const measure = () => document.body.getBoundingClientRect().height;
  let scale = 1;
  try {
    if (measure() > availablePx) {
      // التصغير يقلّل التفاف النص أيضاً، فالنسبة المناسبة تُوجد بالبحث الثنائي بدل القسمة المباشرة
      let lo = MIN_FIT_SCALE;
      let hi = 1;
      for (let i = 0; i < 7; i += 1) {
        const mid = (lo + hi) / 2;
        document.body.style.setProperty('zoom', String(mid));
        if (measure() <= availablePx) lo = mid;
        else hi = mid;
      }
      scale = lo;
    }
  } finally {
    document.body.style.removeProperty('zoom');
    targets.forEach((el) => props.forEach((p) => el.style.removeProperty(p)));
    style.remove();
  }
  if (scale < 1) document.body.style.setProperty('zoom', String(scale));
  return scale;
}

export function printReport({ section, title, orientation = 'landscape', bodyClass, fit = true } = {}) {
  const page = document.createElement('style');
  const parts = footerParts();
  const marginBoxes = supportsPageMargins();
  page.textContent = pageCss(orientation, parts, marginBoxes);
  // متصفح بلا دعم لهوامش @page: يُملأ تذييل داخل المستند ويُطبع مرة في آخره
  const footerEl = document.querySelector('.print-footer');
  if (footerEl && hasFooter(parts) && !marginBoxes) {
    const row = (text, className) => Object.assign(document.createElement('div'), { textContent: text, className });
    footerEl.replaceChildren(...parts.center.map((l) => row(l, 'print-footer-line')), ...(parts.by ? [row(parts.by, 'print-footer-by')] : []));
    document.body.classList.add('print-footer-flow');
  }
  document.head.appendChild(page);
  document.documentElement.style.setProperty('--print-content-h', `${portraitContentHeightMm(parts, marginBoxes)}mm`);

  const titleEl = document.querySelector('.rp-title');
  const oldTitle = titleEl?.textContent;
  if (title && titleEl) titleEl.textContent = title;
  section?.classList.add('print-target');
  document.body.classList.add('print-report');
  if (bodyClass) document.body.classList.add(bodyClass);
  if (section) document.body.classList.add('print-section');
  if (fit) fitToOnePage(orientation, printableHeightMm(orientation, parts, marginBoxes));

  const cleanup = () => {
    document.body.classList.remove('print-report', 'print-section', 'print-footer-flow');
    if (bodyClass) document.body.classList.remove(bodyClass);
    section?.classList.remove('print-target');
    if (title && titleEl) titleEl.textContent = oldTitle;
    page.remove();
    document.body.style.removeProperty('zoom');
    document.documentElement.style.removeProperty('--print-content-h');
    footerEl?.replaceChildren();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
