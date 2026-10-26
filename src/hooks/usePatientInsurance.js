import { useCallback, useEffect, useState } from 'react';
import { NO_INSURANCE } from '../components/common/InsuranceSelector';

// التأمين المسجّل في ملف المريض (الشركة + مبلغ تحمّله بالدينار)
export const insuranceFromPatient = (patient) =>
  patient?.insurance_id
    ? { companyId: String(patient.insurance_id), copay: String(patient.insurance_copay ?? '') }
    : NO_INSURANCE;

// حالة التأمين لنموذج زيارة: تبدأ من تأمين المريض وتتحدّث عند تغيير المريض
// ويمكن تعديلها لهذه الزيارة فقط. reset() تعيدها لتأمين المريض بعد الحفظ.
export function usePatientInsurance(patient) {
  const [insurance, setInsurance] = useState(() => insuranceFromPatient(patient));

  useEffect(() => {
    setInsurance(insuranceFromPatient(patient));
  }, [patient?.id, patient?.insurance_id, patient?.insurance_copay]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => setInsurance(insuranceFromPatient(patient)), [patient]);

  return [insurance, setInsurance, reset];
}
