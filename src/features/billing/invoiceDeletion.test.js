import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeInvoiceDeletion } from './invoiceDeletion.js';

const invoice = { inv_no: 'INV-7', patient_name: 'سالم', paid: 0 };

test('فاتورة بلا مدفوعات ولا مخزون: رسالة بسيطة', () => {
  const r = summarizeInvoiceDeletion({ invoice, back: { supplies: [], aid: null }, canReturnAids: true });
  assert.equal(r.message, 'حذف الفاتورة INV-7 (سالم) بالكامل؟');
  assert.equal(r.successText, 'تم حذف الفاتورة.');
  assert.equal(r.returnAid, false);
  assert.deepEqual(r.restored, []);
});

test('تحذير المدفوعات وقائمة ما يُعاد للمخزون', () => {
  const r = summarizeInvoiceDeletion({
    invoice: { ...invoice, paid: 40 },
    back: { supplies: [{ name: 'قطن', qty: 2 }, { name: 'شاش', qty: 1 }], aid: null },
    canReturnAids: true,
  });
  assert.match(r.message, /سُجّل عليها مدفوعات \(40 د\.أ\)/);
  assert.match(r.message, /سيُعاد إلى المخزون: قطن × 2، شاش × 1\./);
  assert.equal(r.successText, 'تم حذف الفاتورة وإرجاع الكميات إلى المخزون.');
});

test('السماعة تُرجَع فقط لمن يملك الصلاحية', () => {
  const back = { supplies: [], aid: { id: 'x', name: 'سماعة A' } };
  const allowed = summarizeInvoiceDeletion({ invoice, back, canReturnAids: true });
  assert.equal(allowed.returnAid, true);
  assert.deepEqual(allowed.restored, ['سماعة A']);
  assert.doesNotMatch(allowed.message, /لن تُرجَع/);

  const denied = summarizeInvoiceDeletion({ invoice, back, canReturnAids: false });
  assert.equal(denied.returnAid, false);
  assert.deepEqual(denied.restored, []);
  assert.match(denied.message, /لن تُرجَع سماعة A تلقائياً/);
  assert.equal(denied.successText, 'تم حذف الفاتورة.');
});
