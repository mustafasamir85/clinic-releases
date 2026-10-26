import { useEffect, useMemo, useState } from 'react';
import Autocomplete from './Autocomplete';
import { useSuggestionHistory } from './SuggestionsContext';
import { canSearchIcd10, searchIcd10 } from '../../utils/icd10';
import { diagnosisEntries, rankMatches, splitLastSegment } from '../../utils/suggestions';

const getText = (e) => e.text;
const render = (e) => (
  <>
    {e.icd ? '🌐' : '🩺'} {e.text}
    {e.count > 0 && <small style={{ marginRight: '8px', fontWeight: '500', opacity: 0.65 }}>({e.count}×)</small>}
  </>
);

const DEBOUNCE_MS = 300;
const ICD_LIMIT = 8;

// تشخيصات ICD-10-CM المطابقة لما يكتبه المستخدم (بتأخير قصير كي لا يُرسل طلب مع كل حرف، وبإلغاء الطلب القديم).
// أي فشل (لا إنترنت، الخدمة متوقفة) يُتجاهل بصمت ويبقى الإكمال المحلي يعمل.
function useIcd10(query) {
  const [state, setState] = useState({ query: '', items: [] });

  useEffect(() => {
    if (!canSearchIcd10(query)) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const items = await searchIcd10(query, { signal: controller.signal, limit: ICD_LIMIT });
        if (!controller.signal.aborted) setState({ query, items });
      } catch {
        /* لا نزعج المستخدم: الاقتراحات المحلية تكفي */
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // نتائج نص قديم لا تُعرض مع نص جديد
  return state.query === query && canSearchIcd10(query) ? state.items : [];
}

// حقل تشخيص بإكمال تلقائي من تشخيصات العيادة السابقة وقائمة جاهزة وتصنيف ICD-10-CM العالمي (NLM).
// يقبل نصاً حراً، ويمكن إضافة أكثر من تشخيص بفاصلة.
export default function DiagnosisInput({ value, onChange, placeholder = 'ابدأ بكتابة التشخيص (عربي أو ICD-10 بالإنجليزية)...', multiline = false, rows = 2, required = false, autoFocus = false }) {
  const history = useSuggestionHistory();
  const { head, last } = splitLastSegment(value);
  const icd = useIcd10(last);

  const items = useMemo(() => {
    if (!last) return [];
    // مع وجود نتائج ICD نقلّل المحلية كي تظهر الاثنتان في القائمة
    const local = rankMatches(diagnosisEntries(history), last, icd.length > 0 ? 4 : 8);
    const seen = new Set(local.map((e) => e.text.toLowerCase()));
    return [...local, ...icd.filter((e) => !seen.has(e.text.toLowerCase()))];
  }, [history, last, icd]);

  return (
    <Autocomplete
      value={value}
      onChange={onChange}
      items={items}
      prefiltered
      getText={getText}
      renderItem={render}
      onSelect={(entry) => onChange(head + entry.text)}
      placeholder={placeholder}
      multiline={multiline}
      rows={rows}
      required={required}
      autoFocus={autoFocus}
    />
  );
}
