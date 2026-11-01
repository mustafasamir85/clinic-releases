import { useSyncExternalStore } from 'react';

// مخزن صغير يجمّع حالة الحفظ لكل المجموعات (collections) في حالة واحدة تعرضها الترويسة.
// useSyncedState يبلّغ عنه عبر reportSync، و SyncIndicator يقرأه عبر useSyncStatus.
//
// الحالات لكل مجموعة: 'saving' (تعديل ينتظر/قيد الإرسال) | 'retrying' (فشل بسبب الاتصال وسيُعاد) | 'error' (رفض نهائي)
// الحالة العامة بالأولوية: error > offline > saving > idle
const ERROR_TTL_MS = 10000; // رسالة الرفض تختفي بعد فترة (البيانات أُعيدت لنسخة السيرفر أصلاً)

const entries = new Map(); // collection -> { state, message, token }
const listeners = new Set();
let lastSavedAt = null;
let browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
let snapshot = { status: 'idle', pending: 0, message: null, lastSavedAt: null };
let token = 0;

function compute() {
  const all = [...entries.values()];
  const failed = all.find((e) => e.state === 'error');
  const retrying = all.some((e) => e.state === 'retrying');
  const saving = all.filter((e) => e.state === 'saving' || e.state === 'retrying').length;
  let status = 'idle';
  let message = null;
  if (failed) {
    status = 'error';
    message = failed.message;
  } else if (!browserOnline || retrying) {
    status = 'offline';
  } else if (saving > 0) {
    status = 'saving';
  }
  snapshot = { status, pending: saving, message, lastSavedAt };
  listeners.forEach((fn) => fn());
}

// state: 'saving' | 'retrying' | 'error' | 'saved' | 'idle'
// saved = نجح الحفظ (يسجّل وقته)، idle = لا شيء معلّق (بدون تسجيل وقت)
export function reportSync(collection, state, message = null) {
  if (state === 'saved' || state === 'idle') {
    if (state === 'saved') lastSavedAt = Date.now();
    entries.delete(collection);
  } else {
    const mine = ++token;
    entries.set(collection, { state, message, token: mine });
    if (state === 'error') {
      setTimeout(() => {
        if (entries.get(collection)?.token === mine) {
          entries.delete(collection);
          compute();
        }
      }, ERROR_TTL_MS);
    }
  }
  compute();
}

// عند تسجيل الخروج: لا نُبقي حالة المستخدم السابق
export function resetSync() {
  entries.clear();
  lastSavedAt = null;
  compute();
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const getSnapshot = () => snapshot;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { browserOnline = true; compute(); });
  window.addEventListener('offline', () => { browserOnline = false; compute(); });
}

export function useSyncStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
