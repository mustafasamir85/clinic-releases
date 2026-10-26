import { useCallback } from 'react';
import { newId } from '../utils/id';
import { useSyncedState } from './useSyncedState';
import { INITIAL_INVOICES } from '../data/initialData';
import { INVOICE_STATUS } from '../constants';
import { getToday } from '../utils/format';

const nextInvoiceNumber = (invoices) => {
  const max = invoices.reduce((m, inv) => {
    const n = parseInt(String(inv.inv_no || '').match(/(\d+)$/)?.[1], 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `INV-${new Date().getFullYear()}-${String(max + 1).padStart(3, '0')}`;
};

const round2 = (n) => Math.round(n * 100) / 100;

// المستحق على المريض = الإجمالي - حصة شركة التأمين
export const patientDue = (inv) => round2(inv.total - (inv.insurance_amount ?? 0));

const statusFor = (paid, due) =>
  paid >= due ? INVOICE_STATUS.PAID : paid > 0 ? INVOICE_STATUS.PARTIAL : INVOICE_STATUS.PENDING;

// حصة التأمين = الإجمالي − مبلغ تحمّل المريض الثابت (بالدينار، ولا يتجاوز الإجمالي).
// insurance = { name, copay } أو null. تعيد { copay, amount } (amount = حصة التأمين).
export const insuranceShare = (total, insurance) => {
  if (!insurance?.name) return { copay: 0, amount: 0 };
  const copay = round2(Math.min(Math.max(0, Number(insurance.copay) || 0), Math.max(0, total)));
  return { copay, amount: round2(total - copay) };
};

// مبلغ تحمّل المريض في فاتورة. الفواتير القديمة (نسبة تغطية) تُحوَّل إلى ما كان يدفعه المريض فعلاً.
export const invoiceCopay = (inv) => (inv.insurance_company ? inv.insurance_copay ?? patientDue(inv) : 0);

// بنود الفاتورة: المحفوظة، أو بند واحد مشتق من الفواتير القديمة (service + total)
export const invoiceItems = (inv) =>
  inv.items?.length ? inv.items : [{ id: 'legacy', description: inv.service, qty: 1, price: inv.total }];

export const itemsTotal = (items) => round2(items.reduce((t, i) => t + Number(i.qty) * Number(i.price), 0));
const itemsService = (items) => items.map((i) => (i.qty > 1 ? `${i.description} ×${i.qty}` : i.description)).join(' + ');

// يضيف للفاتورة دفعة بتاريخ اليوم (أساس الكشف النقدي اليومي). newPaid = إجمالي المدفوع بعد الدفعة.
const withPayment = (inv, newPaid, by = '') => {
  const applied = round2(newPaid - (inv.paid ?? 0));
  return {
    ...inv,
    paid: newPaid,
    status: statusFor(newPaid, patientDue(inv)),
    ...(applied > 0 ? { payments: [...(inv.payments ?? []), { date: getToday(), amount: applied, ...(by ? { by } : {}) }] } : {}),
  };
};

export function useInvoices(enabled, currentUser = null) {
  const [invoices, setInvoices] = useSyncedState('invoices', INITIAL_INVOICES, enabled);
  const payer = currentUser?.name || currentUser?.username || ''; // من يقبض الدفعة (يظهر في الكشف النقدي)

  // paid فارغ = يدفع المريض كامل حصته. insurance = { name, copay } اختياري. source = مصدر الفاتورة (مثل 'supply_sale' لبيع المستلزمات) اختياري.
  const createInvoice = useCallback(
    ({ patientName, patientId = null, service, total, items, paid, insurance, source, stockLines }) => {
      // عند وجود بنود يُحسب الإجمالي ووصف الخدمة منها
      const totalNum = items?.length ? itemsTotal(items) : Number(total);
      const { copay, amount: insuranceAmount } = insuranceShare(totalNum, insurance);
      const due = round2(totalNum - insuranceAmount);

      const paidNum =
        paid === '' || paid === null || paid === undefined ? due : Math.min(Number(paid), due);

      const invoice = {
        id: newId(),
        inv_no: nextInvoiceNumber(invoices),
        patient_name: patientName,
        patient_id: patientId,
        service: items?.length ? itemsService(items) : service,
        ...(items?.length ? { items } : {}),
        ...(source ? { source } : {}),
        // ما خُصم من المخزون: يُعاد عند حذف الفاتورة
        ...(stockLines?.length ? { stock_lines: stockLines } : {}),
        // المستخدم الذي أصدر الفاتورة (يُثبَّت أيضاً من الخادم)
        ...(currentUser ? { created_by: currentUser.name || currentUser.username, created_by_username: currentUser.username } : {}),
        total: totalNum,
        insurance_company: insurance?.name ?? '',
        insurance_copay: copay,
        insurance_amount: insuranceAmount,
        paid: paidNum,
        ...(paidNum > 0 ? { payments: [{ date: getToday(), amount: paidNum, ...(payer ? { by: payer } : {}) }] } : {}),
        status: statusFor(paidNum, due),
        date: getToday(),
      };
      setInvoices((prev) => [invoice, ...prev]);
      return invoice;
    },
    [invoices, currentUser, payer]
  );

  const confirmPayment = useCallback((id) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? withPayment(inv, patientDue(inv), payer) : inv))
    );
  }, [payer]);

  const removeInvoice = useCallback((id) => setInvoices((prev) => prev.filter((i) => i.id !== id)), []);

  // تسجيل دفعة من المريض (لا تتجاوز المتبقي). تعيد المبلغ المسجَّل فعلاً.
  const recordPayment = useCallback((id, amount) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const due = patientDue(inv);
        return withPayment(inv, round2(Math.min(due, inv.paid + Number(amount))), payer);
      })
    );
  }, [payer]);

  // تعديل فاتورة زيارة بعد تغيير إجراءاتها: يعاد حساب حصة التأمين والحالة، ويبقى المدفوع كما هو
  const updateInvoice = useCallback((id, { service, total, items, insurance }) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;
        const totalNum = items?.length ? itemsTotal(items) : Number(total);
        const { copay, amount } = insuranceShare(totalNum, insurance);
        const due = round2(totalNum - amount);
        return {
          ...inv,
          service: items?.length ? itemsService(items) : service,
          items: items?.length ? items : undefined,
          total: totalNum,
          insurance_company: insurance?.name ?? '',
          insurance_copay: copay,
          insurance_coverage: undefined, // حقل النسبة القديم لم يعد مستخدماً
          insurance_amount: amount,
          status: statusFor(inv.paid, due),
        };
      })
    );
  }, []);

  // إلغاء فاتورة: تُحذف إن لم يُدفع منها شيء، وإلا تُصفَّر قيمتها وتبقى للسجل المحاسبي. تعيد true إذا حُذفت.
  const cancelInvoice = useCallback(
    (id) => {
      const inv = invoices.find((i) => i.id === id);
      if (!inv) return true;
      if (!inv.paid) {
        setInvoices((prev) => prev.filter((i) => i.id !== id));
        return true;
      }
      updateInvoice(id, { service: `${inv.service} (أُلغيت الإجراءات)`, total: 0, insurance: null });
      return false;
    },
    [invoices, updateInvoice]
  );

  return { invoices, createInvoice, confirmPayment, recordPayment, updateInvoice, cancelInvoice, removeInvoice };
}
