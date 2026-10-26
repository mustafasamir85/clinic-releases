import { getToday } from '../../utils/format';

const round2 = (n) => Math.round(n * 100) / 100;

// حالة العرض: موقوف يدوياً، مجدول (لم يبدأ)، منتهي، أو ساري
export function offerStatus(offer, today = getToday()) {
  if (!offer.active) return 'موقوف';
  if (offer.start && today < offer.start) return 'مجدول';
  if (offer.end && today > offer.end) return 'منتهي';
  return 'ساري';
}

export const isOfferRunning = (offer) => offerStatus(offer) === 'ساري';

export const offerValueText = (offer) => (offer.type === 'percent' ? `${offer.value}%` : `${offer.value} د.أ`);

// قيمة خصم العرض على بنود الفاتورة. items = بنود منظّفة، services = قائمة الخدمات لمعرفة اسم خدمة العرض.
// يعيد { amount, error }: العرض الخاص بخدمة يُطبَّق على بنودها فقط (وصف البند = اسم الخدمة).
export function offerDiscount(offer, items, services) {
  const subtotal = items.reduce((t, i) => t + i.qty * i.price, 0);
  let base = subtotal;

  if (offer.service_id) {
    const name = services.find((s) => String(s.id) === String(offer.service_id))?.name ?? offer.service_name;
    base = items.filter((i) => i.description === name || i.free_of === name).reduce((t, i) => t + i.qty * i.price, 0); // free_of: بند الخصم المقابل لخدمة مجانية
    if (base <= 0) return { amount: 0, error: `هذا العرض خاص بالخدمة "${name}" وهي غير موجودة في الفاتورة.` };
  }
  if (base <= 0) return { amount: 0, error: 'أضف بنوداً أولاً لتطبيق العرض.' };

  const raw = offer.type === 'percent' ? (base * offer.value) / 100 : offer.value;
  return { amount: round2(Math.min(raw, base)), error: '' };
}

// يضيف بند خصم العرض (إن وُجد العرض وانطبق) إلى البنود. يعيد { items, discount, error, offer }.
// بند الخصم يحمل offer_id ليُعرف لاحقاً ويمكن إزالته أو استبداله.
export function withOffer(items, offerId, offers, services) {
  const offer = offerId ? offers.find((o) => String(o.id) === String(offerId)) : null;
  if (!offer) return { items, discount: 0, error: '', offer: null };

  const { amount, error } = offerDiscount(offer, items, services);
  if (amount <= 0) return { items, discount: 0, error, offer };

  return {
    items: [...items, { id: `offer-${offer.id}`, offer_id: offer.id, description: `خصم: ${offer.name}`, qty: 1, price: -amount }],
    discount: amount,
    error: '',
    offer,
  };
}
