import axios from 'axios';

// البحث في تصنيف ICD-10-CM عبر خدمة NLM Clinical Tables (مجانية وتسمح بالطلب من المتصفح).
// الرد: [العدد الكلي، [الرموز], null, [[الرمز، الاسم], ...]]
const ICD10_URL = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search';

const cache = new Map(); // نتائج سبق جلبها (تقلّل الطلبات عند الكتابة والمسح)

// الفاصلة تفصل بين التشخيصات في حقل التشخيص، فنستبدلها في اسم الحالة كي لا يُقسَّم الاسم الواحد
const toEntry = ([code, name]) => ({ text: `${String(name).replace(/\s*,\s*/g, ' - ')} (${code})`, code, count: 0, icd: true });

// الخدمة إنجليزية فقط: لا نطلب إلا إن كان النص يحوي حروفاً لاتينية وثلاثة أحرف على الأقل
export const canSearchIcd10 = (terms) => {
  const t = terms.trim();
  return t.length >= 3 && /[A-Za-z]/.test(t);
};

export async function searchIcd10(terms, { signal, limit = 8 } = {}) {
  const q = terms.trim();
  const key = `${limit}|${q.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);

  const { data } = await axios.get(ICD10_URL, {
    params: { sf: 'code,name', df: 'code,name', terms: q, maxList: limit },
    timeout: 8000,
    signal,
  });
  const rows = Array.isArray(data?.[3]) ? data[3] : [];
  const entries = rows.map(toEntry);
  cache.set(key, entries);
  return entries;
}
