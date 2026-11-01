import { useCallback } from 'react';
import { useSyncedState } from './useSyncedState';
import { newId } from '../utils/id';

// قائمة عناصر بسيطة مع إضافة / تعديل / حذف، تُحفظ على السيرفر في المجموعة collection
export function useCrudList(collection, initialItems, enabled) {
  const [items, setItems, { loading }, refresh] = useSyncedState(collection, initialItems, enabled);

  // تعيد معرّف العنصر الجديد (يحتاجه المخزون لتسجيل حركة الصنف الجديد)
  const add = useCallback((item) => {
    const id = newId();
    setItems((prev) => [...prev, { ...item, id }]);
    return id;
  }, [setItems]);

  const update = useCallback(
    (id, changes) =>
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item))),
    [setItems]
  );

  // تعديل يعتمد على القيمة الحالية: patch(id, (s) => ({ stock: s.stock + 5 }))
  // يقرأ أحدث حالة دائماً فلا يضيع تعديل عند تتابع عدة تعديلات في نفس اللحظة
  const patch = useCallback(
    (id, fn) =>
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...fn(item) } : item))),
    [setItems]
  );

  // إعادة عنصر محذوف بنفس معرّفه وموضعه السابق (للتراجع عن الحذف)
  const restore = useCallback(
    (item, index) =>
      setItems((prev) => {
        if (prev.some((x) => String(x.id) === String(item.id))) return prev;
        const at = Number.isInteger(index) ? Math.min(Math.max(index, 0), prev.length) : prev.length;
        return [...prev.slice(0, at), item, ...prev.slice(at)];
      }),
    [setItems]
  );

  const remove = useCallback((id) => setItems((prev) => prev.filter((item) => item.id !== id)), [setItems]);

  return { items, add, update, patch, remove, restore, refresh, loading };
}
