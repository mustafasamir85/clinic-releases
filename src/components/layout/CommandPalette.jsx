import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft, Search, User } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';
import { getFileNumber } from '../../utils/format';
import { matchesAll, normalizeText, tokensOf } from '../../utils/search';
import { NAV_TABS } from './navItems';

const MAX_PATIENTS = 8;

// فهرس بحث المرضى: الاسم + رقم الملف + الهاتف (بصيغتيه: كما كُتب وأرقاماً فقط)
const buildIndex = (patients) =>
  patients.map((p) => {
    const phone = normalizeText(p.phone);
    const file = normalizeText(getFileNumber(p));
    const name = normalizeText(p.name);
    return { patient: p, name, file, hay: `${name} ${file} ${phone} ${phone.replace(/\D/g, '')}` };
  });

// ترتيب النتائج: رقم الملف المطابق تماماً ← الاسم يبدأ بالكلمة الأولى ← أي كلمة تبدأ بها ← الباقي
const score = (entry, tokens) => {
  const [first] = tokens;
  if (entry.file === first) return 3;
  if (entry.name.startsWith(first)) return 2;
  if (entry.name.split(' ').some((w) => w.startsWith(first))) return 1;
  return 0;
};

// لوحة البحث الشامل (Ctrl+K): مريض بالاسم/رقم الملف/الهاتف، أو الانتقال لشاشة، أو إجراء سريع.
// patients: كل المرضى (يُهمَل إن لم يملك المستخدم شاشة تعرضهم) — can(id): صلاحية الشاشة
// actions: [{ id, label, icon, run }] — onPickPatient(patient) — onGoTab(id) — onClose()
export default function CommandPalette({ patients, canSearchPatients, can, actions, onPickPatient, onGoTab, onClose }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [limit, setLimit] = useState(MAX_PATIENTS); // عدد المرضى المعروضين؛ يزيد بزر «عرض المزيد»
  const ref = useRef(null);
  const listRef = useRef(null);
  const uid = useId();

  useDialog(ref, { onEscape: onClose, initialFocus: '.cmdk-input' });

  const index = useMemo(() => (canSearchPatients ? buildIndex(patients) : []), [patients, canSearchPatients]);

  // كل الصفوف بالترتيب: مجموعة → عناصرها (لكل عنصر run ينفَّذ عند الاختيار)
  const groups = useMemo(() => {
    const tokens = tokensOf(query);
    const matchLabel = (label) => tokens.length === 0 || matchesAll(normalizeText(label), tokens);

    // كل المطابقين مرتّبين؛ نعرض أول MAX_PATIENTS ونوضّح للمستخدم أن هناك المزيد (لا نُظهر القائمة كأنها كاملة)
    const matched = tokens.length
      ? index
          .filter((e) => matchesAll(e.hay, tokens))
          .map((e) => ({ e, s: score(e, tokens) }))
          .sort((a, b) => b.s - a.s || a.e.patient.name.localeCompare(b.e.patient.name, 'ar'))
      : [];
    const patientOverflow = matched.length - limit;
    const patientItems = tokens.length
      ? matched
          .slice(0, limit)
          .map(({ e }) => ({
            key: `p-${e.patient.id}`,
            label: e.patient.name,
            hint: [`ملف ${getFileNumber(e.patient)}`, e.patient.phone].filter(Boolean).join(' · '),
            icon: User,
            run: () => onPickPatient(e.patient),
          }))
      : [];

    const actionItems = actions.filter((a) => matchLabel(a.label)).map((a) => ({ key: `a-${a.id}`, label: a.label, icon: a.icon, run: a.run }));
    const tabItems = NAV_TABS.filter((t) => can(t.id) && matchLabel(t.label)).map((t) => ({ key: `t-${t.id}`, label: t.label, icon: t.icon, run: () => onGoTab(t.id) }));

    return [
      { title: 'المرضى', items: patientItems, note: patientOverflow > 0 ? { text: `يُعرض ${limit} من ${matched.length} مريضاً — أضف حروفاً لتضييق البحث، أو:`, more: () => setLimit((n) => n + MAX_PATIENTS) } : null },
      { title: 'إجراءات سريعة', items: actionItems },
      { title: 'الانتقال إلى شاشة', items: tabItems },
    ].filter((g) => g.items.length > 0);
  }, [query, index, actions, can, onPickPatient, onGoTab, limit]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setActive(0);
    setLimit(MAX_PATIENTS); // بحث جديد: نبدأ من أول 8
  }, [query]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, groups]);

  const run = (item) => {
    onClose();
    item?.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length === 0) return;
      setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % flat.length : (i - 1 + flat.length) % flat.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(flat[active]);
    }
  };

  let position = -1; // رقم العنصر في القائمة المسطّحة
  const optionId = (i) => `${uid}-opt-${i}`;

  return createPortal(
    <div className="cmdk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} className="cmdk" role="dialog" aria-modal="true" aria-label="بحث شامل">
        <div className="cmdk-search">
          <Search size={18} aria-hidden="true" />
          <input
            className="cmdk-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-list`}
            aria-activedescendant={flat.length ? optionId(active) : undefined}
            autoComplete="off"
            spellCheck="false"
            placeholder={canSearchPatients ? 'ابحث عن مريض (الاسم، رقم الملف، الهاتف) أو شاشة…' : 'ابحث عن شاشة أو إجراء…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        <div className="cmdk-list" id={`${uid}-list`} role="listbox" ref={listRef}>
          {flat.length === 0 && <div className="cmdk-empty">لا توجد نتائج لـ «{query.trim()}»</div>}
          {groups.map((g) => (
            <div key={g.title} role="group" aria-label={g.title}>
              <div className="cmdk-group">{g.title}</div>
              {g.items.map((item) => {
                position += 1;
                const i = position;
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === active}
                    className={`cmdk-item ${i === active ? 'active' : ''}`}
                    onMouseMove={() => active !== i && setActive(i)}
                    onClick={() => run(item)}
                  >
                    {Icon && <Icon size={17} aria-hidden="true" />}
                    <span className="cmdk-item-label">{item.label}</span>
                    {item.hint && <span className="cmdk-item-hint">{item.hint}</span>}
                    {i === active && <CornerDownLeft size={14} className="cmdk-enter" aria-hidden="true" />}
                  </div>
                );
              })}
              {g.note && (
                <div className="cmdk-note">
                  {g.note.text}{' '}
                  {/* mousedown لا ينقل التركيز من حقل البحث، فيستمر المستخدم بالكتابة */}
                  <button type="button" className="cmdk-more" onMouseDown={(e) => e.preventDefault()} onClick={g.note.more}>عرض المزيد</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="cmdk-footer" aria-hidden="true">
          <span><kbd>↑</kbd> <kbd>↓</kbd> للتنقل</span>
          <span><kbd>Enter</kbd> للفتح</span>
          <span><kbd>Esc</kbd> للإغلاق</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
