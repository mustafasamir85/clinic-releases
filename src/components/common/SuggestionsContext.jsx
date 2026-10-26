import { createContext, useContext, useMemo } from 'react';
import { EMPTY_HISTORY, collectHistory } from '../../utils/suggestions';

const SuggestionsContext = createContext(EMPTY_HISTORY);

// يحسب مرة واحدة ما سبق إدخاله في العيادة (تشخيصات وطرق استخدام) فتستعمله كل حقول الإكمال التلقائي
export function SuggestionsProvider({ patients, children }) {
  const history = useMemo(() => collectHistory(patients), [patients]);
  return <SuggestionsContext.Provider value={history}>{children}</SuggestionsContext.Provider>;
}

export const useSuggestionHistory = () => useContext(SuggestionsContext);
