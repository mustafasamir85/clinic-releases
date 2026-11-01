// أدوات الصورة المرفقة بالرسائل (دوال نقية بلا اعتماديات، قابلة للاختبار).
// الصورة تُصغَّر وتُضغط في المتصفح قبل الرفع (JPEG)، فالحد الأقصى هنا يطابق حد الخادم (announcement_rules.py).

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_INPUT_BYTES = 15 * 1024 * 1024; // أكبر ملف نقبله للاختيار (قبل الضغط)
export const MAX_DIMENSION = 1280; // أطول ضلع بالبكسل بعد التصغير
export const TARGET_BYTES = 700 * 1024; // نضغط حتى نصل هذا الحجم أو أقل
export const MAX_UPLOAD_BYTES = 1_500_000; // حد الخادم (لا يُرسَل أكبر منه)

// محاولات الضغط بالترتيب: [معامل تصغير إضافي، جودة JPEG]. نتوقف عند أول نتيجة ≤ TARGET_BYTES.
export const COMPRESSION_PLAN = [
  [1, 0.85],
  [1, 0.72],
  [0.8, 0.72],
  [0.65, 0.65],
  [0.5, 0.6],
];

// أبعاد تتسع داخل مربع max×max بنفس النسبة، دون تكبير الصور الصغيرة وبحد أدنى بكسل واحد
export function scaleToFit(width, height, max = MAX_DIMENSION) {
  if (!(width > 0) || !(height > 0)) return { width: 1, height: 1 };
  const ratio = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

// حجم البايتات الفعلي لنص base64 (بعد فك الترميز)
export function base64ByteLength(base64) {
  const clean = base64.replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

// 'data:image/jpeg;base64,AAAA' => 'AAAA'
export const dataUrlToBase64 = (dataUrl) => dataUrl.slice(dataUrl.indexOf(',') + 1);

// 512 => '512 بايت'، 2048 => '2 ك.ب'، 1.5MB => '1.5 م.ب'
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} م.ب`;
}

// تحقق من الملف المختار قبل المعالجة: يعيد نص الخطأ أو null
export function validateImageFile(file) {
  if (!file) return 'لم يُختَر ملف.';
  if (!ACCEPTED_TYPES.includes(file.type)) return 'نوع الملف غير مدعوم. المسموح: JPEG أو PNG أو WebP أو GIF.';
  if (file.size > MAX_INPUT_BYTES) return `حجم الملف كبير جداً (الحد ${formatBytes(MAX_INPUT_BYTES)}).`;
  return null;
}
