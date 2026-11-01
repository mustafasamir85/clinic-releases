// منطق رسائل مدير النظام (دوال نقية بلا اعتماديات، قابلة للاختبار).

export const MAX_TITLE = 80;
export const MAX_MESSAGE = 1000;

// مستوى الرسالة: يحدد مظهر النافذة. «عاجل» لا يمكن تأجيله: لا يُغلق إلا بزر «تم الاطلاع».
export const ANNOUNCEMENT_LEVELS = {
  info: { label: 'معلومة', rank: 2 },
  important: { label: 'مهم', rank: 1 },
  urgent: { label: 'عاجل', rank: 0 },
};
export const isKnownLevel = (level) => Object.prototype.hasOwnProperty.call(ANNOUNCEMENT_LEVELS, level);

// مدد الصلاحية المتاحة عند الإرسال (days: null = بلا انتهاء)
export const EXPIRY_OPTIONS = [
  { id: '1d', label: 'يوم واحد', days: 1 },
  { id: '3d', label: '3 أيام', days: 3 },
  { id: '7d', label: 'أسبوع', days: 7 },
  { id: '30d', label: 'شهر', days: 30 },
  { id: 'none', label: 'بلا انتهاء', days: null },
];

// تاريخ انتهاء الرسالة (ISO) من خيار المدة، أو null إن كانت بلا انتهاء
export function expiresAtFrom(optionId, now = new Date()) {
  const option = EXPIRY_OPTIONS.find((o) => o.id === optionId);
  if (!option || option.days === null) return null;
  return new Date(now.getTime() + option.days * 24 * 60 * 60 * 1000).toISOString();
}

// تحقق قبل الإرسال: يعيد نص الخطأ أو null
export function validateAnnouncement({ title = '', message = '' }) {
  if (!message.trim()) return 'اكتب نص الرسالة أولاً.';
  if (message.trim().length > MAX_MESSAGE) return `نص الرسالة أطول من ${MAX_MESSAGE} حرفاً.`;
  if (title.trim().length > MAX_TITLE) return `العنوان أطول من ${MAX_TITLE} حرفاً.`;
  return null;
}

// حالة الرسالة في سجل المدير
export function announcementStatus(item, now = new Date()) {
  if (item.revoked_at) return 'revoked';
  if (item.expires_at && new Date(item.expires_at).getTime() <= now.getTime()) return 'expired';
  return 'active';
}

// ترتيب الرسائل غير المقروءة للعرض: العاجل ثم المهم ثم المعلومة، وداخل كل مستوى الأقدم أولاً (تسلسل زمني)
export function sortPending(items) {
  const rank = (i) => ANNOUNCEMENT_LEVELS[i.level]?.rank ?? ANNOUNCEMENT_LEVELS.info.rank;
  return [...items].sort((a, b) => rank(a) - rank(b) || String(a.created_at).localeCompare(String(b.created_at)));
}

// الرسالة المعروضة الآن: أول رسالة لم يؤجّلها المستخدم في هذه الجلسة (التأجيل لا ينطبق على العاجل)
export function nextVisible(pending, postponedIds) {
  return pending.find((i) => i.level === 'urgent' || !postponedIds.has(i.id)) ?? null;
}

// هل يمكن إغلاق الرسالة دون «تم الاطلاع» (تأجيلها لفتح التطبيق التالي)؟
export const canPostpone = (item) => item?.level !== 'urgent';

// إزالة الرسائل المُقرَّة من القائمة فوراً قبل ردّ السيرفر
export const withoutId = (items, id) => items.filter((i) => i.id !== id);
