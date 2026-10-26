import { useCallback, useEffect, useRef, useState } from 'react';

// إشعار نجاح مؤقت يُنظَّف تلقائياً (بدل setTimeout المتكرر)
export function useToast(defaultDuration = 3000) {
  const [message, setMessage] = useState('');
  const timer = useRef(null);

  const show = useCallback(
    (text, duration = defaultDuration) => {
      clearTimeout(timer.current);
      setMessage(text);
      timer.current = setTimeout(() => setMessage(''), duration);
    },
    [defaultDuration]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { message, show };
}
