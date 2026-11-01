import test from 'node:test';
import assert from 'node:assert/strict';
import { isVisitInvoiceGone, returnToStock, supplyUsageDeltas } from './stockDelta.js';

test('returnToStock يعكس الكميات ويحتفظ بالمعرّف والاسم', () => {
  assert.deepEqual(returnToStock([{ id: 'a', name: 'قطن', qty: 3, price: 1 }]), [{ id: 'a', name: 'قطن', qty: -3 }]);
  assert.deepEqual(returnToStock(), []);
});

test('supplyUsageDeltas: زيادة وإنقاص وإضافة وحذف صنف', () => {
  const before = [{ id: 'a', name: 'قطن', qty: 2 }, { id: 'b', name: 'شاش', qty: 5 }, { id: 'c', name: 'مرهم', qty: 1 }];
  const after = [{ id: 'a', name: 'قطن', qty: 4 }, { id: 'b', name: 'شاش', qty: 2 }, { id: 'd', name: 'لاصق', qty: 3 }];
  const byId = Object.fromEntries(supplyUsageDeltas(before, after).map((d) => [d.id, d]));
  assert.equal(byId.a.qty, 2); // استهلاك إضافي
  assert.equal(byId.b.qty, -3); // إرجاع جزئي
  assert.equal(byId.c.qty, -1); // صنف حُذف: يرجع كاملاً
  assert.equal(byId.c.name, 'مرهم');
  assert.equal(byId.d.qty, 3); // صنف جديد
});

test('supplyUsageDeltas: بلا تغيير يعطي صفراً، وبلا بيانات يعطي قائمة فارغة', () => {
  const same = [{ id: 'a', name: 'قطن', qty: 2 }];
  assert.deepEqual(supplyUsageDeltas(same, same).map((d) => d.qty), [0]);
  assert.deepEqual(supplyUsageDeltas(), []);
});

test('supplyUsageDeltas: فاتورة محذوفة (before فارغ) تُعدّ كل الكميات استهلاكاً جديداً', () => {
  assert.deepEqual(supplyUsageDeltas([], [{ id: 'a', name: 'قطن', qty: 2 }]), [{ id: 'a', name: 'قطن', qty: 2 }]);
});

test('isVisitInvoiceGone', () => {
  const invoices = [{ id: 1 }, { id: 2 }];
  assert.equal(isVisitInvoiceGone({ invoice_id: 1 }, invoices), false);
  assert.equal(isVisitInvoiceGone({ invoice_id: 9 }, invoices), true);
  assert.equal(isVisitInvoiceGone({ invoice_id: null }, invoices), false); // زيارة بلا فاتورة أصلاً
  assert.equal(isVisitInvoiceGone({}, invoices), false);
});
