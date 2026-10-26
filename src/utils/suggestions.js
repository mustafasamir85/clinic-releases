import { DIAGNOSIS_SUGGESTIONS, USAGE_SUGGESTIONS } from '../data/clinicalSuggestions';
import { isDefaultUsage, parsePrescription } from './prescription';

const DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g;
// توحيد الكتابة العربية للبحث: بلا تشكيل، والهمزات والألف المقصورة والتاء المربوطة كما يكتبها الناس عادةً
export const normalizeArabic = (s) =>
  String(s ?? '').toLowerCase().replace(DIACRITICS, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();

const bump = (map, text, by = 1) => {
  const key = normalizeArabic(text);
  if (!key) return;
  const cur = map.get(key);
  map.set(key, cur ? { text: cur.text, count: cur.count + by } : { text: String(text).trim(), count: by });
};

// ما سبق كتابته في العيادة: تشخيصات الزيارات والوثائق، وطرق الاستخدام (عامة وحسب اسم الدواء)
export function collectHistory(patients) {
  const diagnoses = new Map();
  const usages = new Map();
  const usageByMed = new Map();
  patients.forEach((p) => {
    (p.visits ?? []).forEach((v) => {
      String(v.diagnosis ?? '').split(/[،,\n]/).forEach((d) => bump(diagnoses, d));
      parsePrescription(v.prescription).forEach((m) => {
        if (isDefaultUsage(m.usage)) return;
        bump(usages, m.usage);
        const key = normalizeArabic(m.name);
        if (!usageByMed.has(key)) usageByMed.set(key, new Map());
        bump(usageByMed.get(key), m.usage);
      });
    });
    (p.documents ?? []).forEach((d) => {
      const text = String(d.diagnosis ?? '').trim();
      if (text && text.length <= 80) bump(diagnoses, text);
    });
  });
  const list = (map) => [...map.values()];
  return { diagnoses: list(diagnoses), usages: list(usages), usageByMed: new Map([...usageByMed].map(([k, v]) => [k, list(v)])) };
}
export const EMPTY_HISTORY = { diagnoses: [], usages: [], usageByMed: new Map() };

// ترتيب الاقتراحات: المثبّتة أولاً، ثم بداية الكلمة/العبارة، ثم الأكثر استعمالاً. بلا تكرار ولا ما يطابق المكتوب تماماً.
export function rankMatches(entries, query, limit = 8) {
  const q = normalizeArabic(query);
  const seen = new Set();
  const scored = [];
  entries.forEach((e, order) => {
    const t = normalizeArabic(e.text);
    if (!t || seen.has(t) || t === q) return;
    let score;
    if (!q) score = 1;
    else if (t.startsWith(q)) score = 3;
    else if (t.includes(` ${q}`)) score = 2;
    else if (t.includes(q)) score = 1;
    else return;
    seen.add(t);
    scored.push({ e, score, order });
  });
  scored.sort((a, b) => (b.e.pinned ?? 0) - (a.e.pinned ?? 0) || b.score - a.score || (b.e.count ?? 0) - (a.e.count ?? 0) || a.order - b.order);
  return scored.slice(0, limit).map((s) => s.e);
}

// القائمة الجاهزة تكتب الاسم العربي ثم الإنجليزي بين قوسين؛ إن كان العربي مستعملاً أصلاً في العيادة لا نكرّره
export function diagnosisEntries(history) {
  const used = new Set(history.diagnoses.map((d) => normalizeArabic(d.text)));
  const builtIn = DIAGNOSIS_SUGGESTIONS.filter((text) => !used.has(normalizeArabic(text.split(' (')[0]))).map((text) => ({ text, count: 0 }));
  return [...history.diagnoses, ...builtIn];
}

// طريقة استخدام دواء: المحفوظة للدواء نفسه أولاً، ثم ما سبق وصفه له، ثم الشائع في العيادة، ثم الجاهز
export function usageEntries({ medication, medName, history }) {
  const entries = [];
  // المحفوظ للدواء نفسه (pinned 2) يتقدّم على ما وُصف له سابقاً (pinned 1)
  if (medication?.usage && !isDefaultUsage(medication.usage)) entries.push({ text: medication.usage, pinned: 2, count: 0 });
  (history.usageByMed.get(normalizeArabic(medName)) ?? []).forEach((e) => entries.push({ ...e, pinned: 1 }));
  return [...entries, ...history.usages, ...USAGE_SUGGESTIONS.map((text) => ({ text, count: 0 }))];
}

// التشخيص قد يضم أكثر من حالة مفصولة بفاصلة: الاقتراح يخص الجزء الأخير فقط
export function splitLastSegment(value) {
  const idx = Math.max(value.lastIndexOf('،'), value.lastIndexOf(','), value.lastIndexOf('\n'));
  return { head: idx >= 0 ? `${value.slice(0, idx + 1)} ` : '', last: value.slice(idx + 1).trimStart() };
}
