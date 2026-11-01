import test from 'node:test';
import assert from 'node:assert/strict';
import { insuranceInfoFrom, planVisitInvoiceSync } from './invoiceSync.js';

const invoices = [{ id: 'inv1' }];
const item = { service: 'x', total: 10 };

test('insuranceInfoFrom', () => {
  assert.deepEqual(insuranceInfoFrom({ insurance_company: 'شركة', insurance_copay: 5 }), { name: 'شركة', copay: 5 });
  assert.equal(insuranceInfoFrom({ insurance_company: '' }), null);
  assert.equal(insuranceInfoFrom({}), null);
  assert.equal(insuranceInfoFrom(undefined), null);
});

test('بند جديد + فاتورة موجودة = تحديث', () => {
  assert.deepEqual(planVisitInvoiceSync({ item, invoiceId: 'inv1', invoices }), { action: 'update', invoiceId: 'inv1' });
});

test('بند جديد + بلا فاتورة = إنشاء', () => {
  assert.deepEqual(planVisitInvoiceSync({ item, invoiceId: null, invoices }), { action: 'create', invoiceId: null });
  assert.deepEqual(planVisitInvoiceSync({ item, invoiceId: undefined, invoices }), { action: 'create', invoiceId: null });
});

test('بند جديد + فاتورة محذوفة من قسم الفواتير = إنشاء فاتورة جديدة', () => {
  assert.deepEqual(planVisitInvoiceSync({ item, invoiceId: 'gone', invoices }), { action: 'create', invoiceId: null });
});

test('لا بند + فاتورة موجودة = إلغاء', () => {
  assert.deepEqual(planVisitInvoiceSync({ item: null, invoiceId: 'inv1', invoices }), { action: 'cancel', invoiceId: 'inv1' });
});

test('لا بند + لا فاتورة (أو محذوفة) = لا شيء ويُفصل الربط', () => {
  assert.deepEqual(planVisitInvoiceSync({ item: null, invoiceId: null, invoices }), { action: 'none', invoiceId: null });
  assert.deepEqual(planVisitInvoiceSync({ item: null, invoiceId: 'gone', invoices }), { action: 'none', invoiceId: null });
});
