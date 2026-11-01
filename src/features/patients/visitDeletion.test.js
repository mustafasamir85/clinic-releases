import test from 'node:test';
import assert from 'node:assert/strict';
import { visitDeletionEffects, visitDeletionPrompts } from './visitDeletion.js';

const invoices = [{ id: 'inv1' }];
const full = { id: 'v1', invoice_id: 'inv1', hearing_aid_id: 'aid1', charges: { supplies: [{ id: 's1', name: 'قطن', qty: 2 }] } };

test('prompts: زيارة بفاتورة موجودة وإجراءات وسماعة تسأل عن الاثنين', () => {
  assert.deepEqual(visitDeletionPrompts({ visit: full, invoices, chargesPresent: true }), { askRevertCharges: true, askReturnAid: true });
});

test('prompts: فاتورة محذوفة أصلاً لا تسأل عن شيء', () => {
  const gone = { ...full, invoice_id: 'deleted' };
  assert.deepEqual(visitDeletionPrompts({ visit: gone, invoices, chargesPresent: true }), { askRevertCharges: false, askReturnAid: false });
});

test('prompts: زيارة بلا إجراءات ولا سماعة', () => {
  const plain = { id: 'v2', invoice_id: null };
  assert.deepEqual(visitDeletionPrompts({ visit: plain, invoices, chargesPresent: false }), { askRevertCharges: false, askReturnAid: false });
});

test('prompts: سماعة بلا إجراءات تسأل عن السماعة فقط', () => {
  const aidOnly = { id: 'v3', invoice_id: 'inv1', hearing_aid_id: 'aid1' };
  assert.deepEqual(visitDeletionPrompts({ visit: aidOnly, invoices, chargesPresent: false }), { askRevertCharges: false, askReturnAid: true });
});

test('effects: رفض الاثنين لا ينفّذ شيئاً', () => {
  assert.deepEqual(visitDeletionEffects({ visit: full, revertCharges: false, returnAid: false }), { stockBack: null, returnAidId: null, cancelInvoiceId: null });
});

test('effects: إرجاع المستلزمات يعكس الكميات ويلغي الفاتورة', () => {
  assert.deepEqual(visitDeletionEffects({ visit: full, revertCharges: true, returnAid: false }), {
    stockBack: [{ id: 's1', name: 'قطن', qty: -2 }],
    returnAidId: null,
    cancelInvoiceId: 'inv1',
  });
});

test('effects: إرجاع السماعة فقط', () => {
  assert.deepEqual(visitDeletionEffects({ visit: full, revertCharges: false, returnAid: true }), { stockBack: null, returnAidId: 'aid1', cancelInvoiceId: 'inv1' });
});

test('effects: نعم للاثنين تُلغي الفاتورة مرة واحدة', () => {
  const r = visitDeletionEffects({ visit: full, revertCharges: true, returnAid: true });
  assert.equal(r.cancelInvoiceId, 'inv1');
  assert.equal(r.returnAidId, 'aid1');
  assert.equal(r.stockBack.length, 1);
});

test('effects: زيارة بلا فاتورة لا تُلغي شيئاً، ومستلزمات ناقصة تعطي قائمة فارغة', () => {
  const noInvoice = { id: 'v4', invoice_id: null, hearing_aid_id: 'aid1', charges: {} };
  const r = visitDeletionEffects({ visit: noInvoice, revertCharges: true, returnAid: true });
  assert.equal(r.cancelInvoiceId, null);
  assert.deepEqual(r.stockBack, []);
});
