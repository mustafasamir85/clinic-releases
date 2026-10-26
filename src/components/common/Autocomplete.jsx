import { useMemo, useState } from 'react';
import { COLORS } from '../../styles';
import { normalizeArabic } from '../../utils/suggestions';

// حقل بحث مع قائمة اقتراحات منسدلة (تعمل بالفأرة ولوحة المفاتيح: ↑ ↓ Enter Esc).
// items: العناصر، getText: النص المستخدم للبحث، renderItem: شكل الاقتراح، onSelect: عند الاختيار
// prefiltered: العناصر مفلترة ومرتّبة من الأعلى فلا يُفلتر داخلياً. multiline: حقل نص متعدد الأسطر.
export default function Autocomplete({
  value,
  onChange,
  items,
  getText,
  renderItem,
  onSelect,
  placeholder,
  onKeyDown,
  inputRef,
  minChars = 1, // 0 = تظهر كل الاقتراحات عند الضغط على الحقل وهو فارغ
  prefiltered = false,
  multiline = false,
  rows = 2,
  required = false,
  autoFocus = false,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = value.trim();
  const normalizedQuery = normalizeArabic(value); // بحث لا يتأثر بالتشكيل ولا بكتابة الهمزة/التاء المربوطة

  const matches = useMemo(() => {
    if (query.length < minChars) return [];
    return prefiltered ? items : items.filter((item) => normalizeArabic(getText(item)).includes(normalizedQuery));
  }, [items, query, normalizedQuery, minChars, getText, prefiltered]);

  const pick = (item) => {
    setOpen(false);
    setActive(-1);
    onSelect(item);
  };

  const handleKeyDown = (e) => {
    if (open && matches.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % matches.length : (i <= 0 ? matches.length : i) - 1));
        return;
      }
      if (e.key === 'Enter' && active >= 0 && active < matches.length) {
        e.preventDefault();
        pick(matches[active]);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const Field = multiline ? 'textarea' : 'input';
  return (
    <div style={{ position: 'relative' }}>
      <Field
        ref={inputRef}
        {...(multiline ? { rows, className: 'warm-textarea' } : { type: 'text', className: 'warm-input' })}
        placeholder={placeholder}
        value={value}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => minChars === 0 && setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        style={{ margin: 0 }}
      />

      {open && matches.length > 0 && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            left: 0,
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '12px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: '220px',
            overflowY: 'auto',
            marginTop: '4px',
          }}
        >
          {matches.map((item, idx) => (
            <div
              key={idx}
              role="option"
              aria-selected={idx === active}
              ref={(el) => idx === active && el?.scrollIntoView?.({ block: 'nearest' })}
              // onMouseDown يعمل قبل blur فلا تُغلق القائمة قبل الاختيار
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setActive(idx)}
              style={{
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: '700',
                color: COLORS.ink,
                cursor: 'pointer',
                borderBottom: `1px solid ${COLORS.soft}`,
                background: idx === active ? COLORS.soft : 'transparent',
              }}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
