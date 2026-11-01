import { useEffect, useState } from 'react';

// ترقيم «عرض المزيد»: يبدأ بـ pageSize عنصراً ويزيد بقدرها عند الطلب.
// resetKey: عند تغيّره (فلتر/بحث جديد) نعود لأول صفحة كي لا تبدأ النتيجة الجديدة مفتوحة على آلاف الصفوف.
export function useShowMore(total, pageSize = 50, resetKey = '') {
  const [count, setCount] = useState(pageSize);
  useEffect(() => setCount(pageSize), [resetKey, pageSize]);
  return {
    visible: Math.min(count, total),
    hasMore: count < total,
    more: () => setCount((c) => c + pageSize),
    all: () => setCount(Number.MAX_SAFE_INTEGER),
  };
}
