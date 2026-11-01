import test from 'node:test';
import assert from 'node:assert/strict';
import { announcementStatus, canPostpone, expiresAtFrom, nextVisible, sortPending, validateAnnouncement, withoutId } from './announcementUtils.js';

const NOW = new Date('2026-11-01T10:00:00.000Z');

test('expiresAtFrom: مدد معروفة، وبلا انتهاء، وخيار مجهول', () => {
  assert.equal(expiresAtFrom('1d', NOW), '2026-11-02T10:00:00.000Z');
  assert.equal(expiresAtFrom('7d', NOW), '2026-11-08T10:00:00.000Z');
  assert.equal(expiresAtFrom('none', NOW), null);
  assert.equal(expiresAtFrom('???', NOW), null);
});

test('validateAnnouncement', () => {
  assert.match(validateAnnouncement({ message: '   ' }), /اكتب نص الرسالة/);
  assert.match(validateAnnouncement({ message: 'x'.repeat(1001) }), /أطول من 1000/);
  assert.match(validateAnnouncement({ title: 'x'.repeat(81), message: 'ok' }), /العنوان أطول من 80/);
  assert.equal(validateAnnouncement({ title: '', message: 'مرحباً' }), null);
  assert.equal(validateAnnouncement({ title: 'x'.repeat(80), message: 'x'.repeat(1000) }), null);
});

test('announcementStatus: ملغاة تغلب المنتهية، والمنتهية تغلب النشطة', () => {
  assert.equal(announcementStatus({ expires_at: null }, NOW), 'active');
  assert.equal(announcementStatus({ expires_at: '2026-11-02T00:00:00Z' }, NOW), 'active');
  assert.equal(announcementStatus({ expires_at: '2026-10-31T00:00:00Z' }, NOW), 'expired');
  assert.equal(announcementStatus({ expires_at: '2026-10-31T00:00:00Z', revoked_at: '2026-10-30T00:00:00Z' }, NOW), 'revoked');
  assert.equal(announcementStatus({ expires_at: '2026-11-01T10:00:00.000Z' }, NOW), 'expired'); // لحظة الانتهاء نفسها
});

test('sortPending: العاجل ثم المهم ثم المعلومة، والأقدم أولاً داخل المستوى، دون تعديل الأصل', () => {
  const items = [
    { id: 1, level: 'info', created_at: '2026-11-01T08:00:00Z' },
    { id: 2, level: 'urgent', created_at: '2026-11-01T09:00:00Z' },
    { id: 3, level: 'important', created_at: '2026-11-01T07:00:00Z' },
    { id: 4, level: 'urgent', created_at: '2026-11-01T06:00:00Z' },
    { id: 5, level: 'weird', created_at: '2026-11-01T05:00:00Z' }, // مستوى مجهول يُعامل كمعلومة
  ];
  assert.deepEqual(sortPending(items).map((i) => i.id), [4, 2, 3, 5, 1]);
  assert.equal(items[0].id, 1);
});

test('nextVisible: يتخطى المؤجَّل إلا العاجل', () => {
  const pending = [
    { id: 'a', level: 'info' },
    { id: 'b', level: 'urgent' },
    { id: 'c', level: 'important' },
  ];
  assert.equal(nextVisible(pending, new Set()).id, 'a');
  assert.equal(nextVisible(pending, new Set(['a'])).id, 'b');
  assert.equal(nextVisible(pending, new Set(['a', 'b'])).id, 'b'); // العاجل لا يُؤجَّل
  assert.equal(nextVisible([{ id: 'x', level: 'info' }], new Set(['x'])), null);
  assert.equal(nextVisible([], new Set()), null);
});

test('canPostpone و withoutId', () => {
  assert.equal(canPostpone({ level: 'urgent' }), false);
  assert.equal(canPostpone({ level: 'important' }), true);
  assert.equal(canPostpone(null), true);
  assert.deepEqual(withoutId([{ id: 1 }, { id: 2 }], 1), [{ id: 2 }]);
});
