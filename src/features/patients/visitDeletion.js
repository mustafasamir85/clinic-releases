import { isVisitInvoiceGone, returnToStock } from '../../utils/stockDelta.js';

// قرارات حذف زيارة (دوال نقية بلا اعتماديات خارج utils/stockDelta).

// ما الأسئلة التي نطرحها على المستخدم بعد تأكيد الحذف؟
//  - فاتورة الزيارة محذوفة أصلاً: مستلزماتها وسماعتها أُرجعت وقت حذفها، فلا نسأل عن إرجاعها ثانية.
//  - chargesPresent: هل في الزيارة إجراءات/مستلزمات (ناتج hasCharges)؟
export function visitDeletionPrompts({ visit, invoices, chargesPresent }) {
  const invoiceGone = isVisitInvoiceGone(visit, invoices);
  return {
    askRevertCharges: !invoiceGone && Boolean(chargesPresent),
    askReturnAid: !invoiceGone && Boolean(visit.hearing_aid_id),
  };
}

// ماذا ننفّذ بناءً على إجابات المستخدم؟
//  - stockBack: أصناف تُرجَع للمخزون بصيغة adjustUsage (null = لا تُنفَّذ العملية أصلاً، وقد تكون [] إن لم تحوِ الزيارة مستلزمات)
//  - returnAidId: معرّف السماعة المُرجَعة لمخزون السماعات (أو null)
//  - cancelInvoiceId: الفاتورة التي تُلغى (مرة واحدة حتى لو أُجيب بنعم على السؤالين)
export function visitDeletionEffects({ visit, revertCharges, returnAid }) {
  const stockBack = revertCharges ? returnToStock(visit.charges?.supplies) : null;
  const returnAidId = returnAid ? visit.hearing_aid_id : null;
  const cancelInvoiceId = (revertCharges || returnAid) && visit.invoice_id ? visit.invoice_id : null;
  return { stockBack, returnAidId, cancelInvoiceId };
}
