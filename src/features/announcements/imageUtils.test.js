import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPRESSION_PLAN, MAX_INPUT_BYTES, MAX_UPLOAD_BYTES, TARGET_BYTES, base64ByteLength, dataUrlToBase64, formatBytes, scaleToFit, validateImageFile } from './imageUtils.js';

test('scaleToFit: يصغّر بنفس النسبة ولا يكبّر', () => {
  assert.deepEqual(scaleToFit(4000, 2000, 1280), { width: 1280, height: 640 });
  assert.deepEqual(scaleToFit(2000, 4000, 1280), { width: 640, height: 1280 });
  assert.deepEqual(scaleToFit(800, 600, 1280), { width: 800, height: 600 }); // أصغر من الحد: كما هي
  assert.deepEqual(scaleToFit(1280, 1280, 1280), { width: 1280, height: 1280 });
});

test('scaleToFit: حالات حدّية', () => {
  assert.deepEqual(scaleToFit(10000, 1, 1280), { width: 1280, height: 1 }); // لا يقل عن بكسل
  assert.deepEqual(scaleToFit(0, 100), { width: 1, height: 1 });
  assert.deepEqual(scaleToFit(-5, 100), { width: 1, height: 1 });
  assert.deepEqual(scaleToFit(NaN, 100), { width: 1, height: 1 });
});

test('base64ByteLength يطابق الحجم الفعلي', () => {
  for (const size of [0, 1, 2, 3, 4, 5, 100, 1023]) {
    const b64 = Buffer.alloc(size, 7).toString('base64');
    assert.equal(base64ByteLength(b64), size, `size ${size}`);
  }
  assert.equal(base64ByteLength('QUJD\nREVG'), 6); // الفراغات تُتجاهل
});

test('dataUrlToBase64', () => {
  assert.equal(dataUrlToBase64('data:image/jpeg;base64,QUJD'), 'QUJD');
});

test('formatBytes', () => {
  assert.equal(formatBytes(512), '512 بايت');
  assert.equal(formatBytes(2048), '2 ك.ب');
  assert.equal(formatBytes(1.5 * 1024 * 1024), '1.5 م.ب');
  assert.equal(formatBytes(2 * 1024 * 1024), '2 م.ب');
});

test('validateImageFile', () => {
  assert.match(validateImageFile(null), /لم يُختَر/);
  assert.match(validateImageFile({ type: 'image/svg+xml', size: 10 }), /غير مدعوم/);
  assert.match(validateImageFile({ type: 'application/pdf', size: 10 }), /غير مدعوم/);
  assert.match(validateImageFile({ type: 'image/png', size: MAX_INPUT_BYTES + 1 }), /كبير جداً/);
  assert.equal(validateImageFile({ type: 'image/png', size: MAX_INPUT_BYTES }), null);
  assert.equal(validateImageFile({ type: 'image/webp', size: 1000 }), null);
});

test('خطة الضغط: تنازلية وهدفها أقل من حد الخادم', () => {
  assert.ok(TARGET_BYTES < MAX_UPLOAD_BYTES);
  for (let i = 1; i < COMPRESSION_PLAN.length; i++) {
    const [prevScale, prevQ] = COMPRESSION_PLAN[i - 1];
    const [scale, q] = COMPRESSION_PLAN[i];
    assert.ok(scale <= prevScale && q <= prevQ, `خطوة ${i} لا تُحسّن الضغط`);
  }
  for (const [scale, q] of COMPRESSION_PLAN) assert.ok(scale > 0 && scale <= 1 && q > 0 && q <= 1);
});
