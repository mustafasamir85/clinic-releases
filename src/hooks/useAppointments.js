import { useCallback } from 'react';
import { newId } from '../utils/id';
import { useSyncedState } from './useSyncedState';
import { APPOINTMENT_STATUS as ST } from '../constants';
import { INITIAL_APPOINTMENTS } from '../data/initialData';

const ACTIVE = [ST.BOOKED, ST.ARRIVED];

// إدارة المواعيد: الحجز والتعديل وتغيير الحالة والحذف
export function useAppointments(enabled) {
  const [items, setItems] = useSyncedState('appointments', INITIAL_APPOINTMENTS, enabled);

  // يمنع تكرار حجز المريض في القسم نفسه باليوم، كما يمنع تعارض الوقت في القسم أو للمريض.
  const findConflict = useCallback(
    ({ date, time, department, patient_id, patient_name }, ignoreId = null) =>
      items.find(
        (a) => {
          const samePatient = a.patient_id && patient_id
            ? String(a.patient_id) === String(patient_id)
            : a.patient_name?.trim() === patient_name?.trim();
          const isActive = ACTIVE.includes(a.status);
          return a.id !== ignoreId && isActive && a.date === date && (
            (a.department === department && samePatient) ||
            (a.time === time && (a.department === department || samePatient))
          );
        }
      ),
    [items]
  );

  const book = useCallback((data) => {
    const appt = { id: newId(), status: ST.BOOKED, notes: '', ...data };
    setItems((prev) => [...prev, appt]);
    return appt;
  }, [setItems]);

  const update = useCallback((id, changes) => {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...changes } : a)));
  }, [setItems]);

  const setStatus = useCallback((id, status) => update(id, { status }), [update]);

  const remove = useCallback((id) => setItems((prev) => prev.filter((a) => a.id !== id)), [setItems]);

  // عند حفظ زيارة: يُكمَل أول موعد فعّال لهذا المريض في هذا القسم اليوم
  const completeFor = useCallback((patient, department, date) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (a) =>
          ACTIVE.includes(a.status) &&
          a.date === date &&
          a.department === department &&
          (a.patient_id ? a.patient_id === patient.id : a.patient_name === patient.name)
      );
      return idx === -1 ? prev : prev.map((a, i) => (i === idx ? { ...a, status: ST.DONE } : a));
    });
  }, [setItems]);

  return { items, findConflict, book, update, setStatus, remove, completeFor };
}
