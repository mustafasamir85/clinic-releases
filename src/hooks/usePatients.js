import { useCallback, useMemo, useState } from 'react';
import { newId } from '../utils/id';
import { useSyncedState } from './useSyncedState';
import { DEFAULT_MEDICAL_HISTORY, DEPARTMENTS } from '../constants';
import { calculateAge, getToday } from '../utils/format';
import { nextDocumentNo } from '../features/documents/documentUtils';

const nextFileNumber = (patients) => {
  const max = patients.reduce((m, p) => {
    const n = parseInt(String(p.file_number || '').match(/(\d+)$/)?.[1], 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 100);
  return `PAT-${new Date().getFullYear()}-${max + 1}`;
};

const lastVisitId = (patient) => {
  const visits = patient?.visits;
  return visits && visits.length > 0 ? visits[visits.length - 1].id : null;
};

export function usePatients(enabled) {
  // لا نختار أي مريض افتراضياً: يظهر المريض فقط بعد البحث عنه واختياره
  const [patients, setPatients, { loading }] = useSyncedState('patients', [], enabled);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedVisitId, setSelectedVisitId] = useState(null);

  // نخزّن المعرّفات فقط ونشتق المريض/الزيارة المحددة من القائمة (مصدر واحد للحقيقة)
  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedId) ?? null,
    [patients, selectedId]
  );
  const selectedVisit = useMemo(
    () => selectedPatient?.visits?.find((v) => v.id === selectedVisitId) ?? null,
    [selectedPatient, selectedVisitId]
  );

  const selectPatient = useCallback((patient) => {
    setSelectedId(patient.id);
    setSelectedVisitId(lastVisitId(patient));
  }, []);

  // إلغاء اختيار المريض الحالي (عند تبديل الشاشة أو الخروج)
  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedVisitId(null);
  }, []);

  const addPatient = useCallback(
    async (form, registeredBy = '') => {
      const payload = {
        file_number: nextFileNumber(patients),
        registered_at: getToday(),
        ...(registeredBy ? { registered_by: registeredBy } : {}),
        name: form.name.trim(),
        birth_date: form.birthDate,
        age: calculateAge(form.birthDate),
        gender: form.gender,
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        insurance_id: form.insurance?.companyId ?? '',
        insurance_copay: form.insurance?.companyId ? form.insurance.copay : '',
        medical_history: DEFAULT_MEDICAL_HISTORY,
        visits: [],
      };

      const saved = { id: newId(), ...payload };

      // تخطيط سمع سابق أُدخل عند التسجيل: يُحفظ كزيارة سمعيات بتاريخه الأصلي (بلا فاتورة لأنه فحص سابق)
      const previous = form.previousAudiogram;
      if (previous) {
        saved.visits = [
          { id: newId(), date: previous.date, department: DEPARTMENTS.AUDIO, prescription: '', summary: previous.summary, audiogram: previous.audiogram, previous: true },
        ];
      }

      // لا نجعل المريض الجديد "حالياً": يُختار فقط عند البحث عنه
      setPatients((prev) => [...prev, saved]);
      return saved;
    },
    [patients]
  );

  const addVisit = useCallback(
    (department, details = {}) => {
      if (!selectedPatient) return null;

      const visit = {
        id: newId(),
        date: getToday(),
        department,
        prescription: '',
        ...details,
      };

      setPatients((prev) =>
        prev.map((p) =>
          p.id === selectedPatient.id ? { ...p, visits: [...(p.visits ?? []), visit] } : p
        )
      );
      setSelectedVisitId(visit.id);


      return visit;
    },
    [selectedPatient]
  );

  // تعديل زيارة: يدمج التغييرات فوق الزيارة الحالية ويحدّث الواجهة فوراً
  const updateVisit = useCallback((patientId, visitId, changes) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId
          ? { ...p, visits: (p.visits ?? []).map((v) => (v.id === visitId ? { ...v, ...changes } : v)) }
          : p
      )
    );
  }, []);

  // حذف زيارة؛ إن كانت هي المحددة ننتقل لآخر زيارة متبقية
  const deleteVisit = useCallback(
    (patientId, visitId) => {
      const patient = patients.find((p) => p.id === patientId);
      const remaining = (patient?.visits ?? []).filter((v) => v.id !== visitId);

      setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, visits: remaining } : p)));
      setSelectedVisitId((current) =>
        current === visitId ? (remaining.length ? remaining[remaining.length - 1].id : null) : current
      );
    },
    [patients]
  );

  // إصدار وثيقة (تقرير طبي / إجازة مرضية) تُحفظ في ملف المريض (مع سجل المريض على السيرفر).
  const addDocument = useCallback(
    (patientId, data) => {
      const doc = { id: newId(), no: nextDocumentNo(patients, data.type), date: getToday(), ...data };
      setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, documents: [...(p.documents ?? []), doc] } : p)));
      return doc;
    },
    [patients]
  );

  const deleteDocument = useCallback((patientId, docId) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, documents: (p.documents ?? []).filter((d) => d.id !== docId) } : p))
    );
  }, []);

  // تحديث محلي فقط — لا يوجد endpoint في الـ API لحفظ التاريخ المرضي حالياً
  const updateMedicalHistory = useCallback((patientId, text) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, medical_history: text } : p))
    );
  }, []);

    const updateInsurance = useCallback((patientId, { companyId, copay }) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patientId ? { ...p, insurance_id: companyId, insurance_copay: copay, insurance_coverage: undefined } : p
      )
    );
  }, []);

  return {
    patients,
    loading,
    selectedPatient,
    selectedVisit,
    selectPatient,
    clearSelection,
    selectVisit: setSelectedVisitId,
    addPatient,
    addVisit,
    updateVisit,
    deleteVisit,
    addDocument,
    deleteDocument,
    updateMedicalHistory,
    updateInsurance,
  };
}
