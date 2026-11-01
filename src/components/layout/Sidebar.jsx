import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronsLeft, ChevronsRight, Menu, X } from 'lucide-react';
import { NAV_DRAWER_MAX, NAV_GROUPS, NAV_WIDE_MIN } from './navItems';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// حالة القائمة (التصغير + المجموعات المطويّة) تُحفظ لكل مستخدم؛ أي فشل في التخزين لا يؤثر على عملها
const STORE_PREFIX = 'clinic-nav:v1:';
const EMPTY = { collapsed: false, closedGroups: [] };

function loadState(userKey) {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_PREFIX + userKey));
    return {
      collapsed: Boolean(v?.collapsed),
      closedGroups: Array.isArray(v?.closedGroups) ? v.closedGroups.filter((g) => typeof g === 'string') : [],
    };
  } catch {
    return EMPTY;
  }
}

// قائمة جانبية متجاوبة. الأوضاع (تُحدَّد من عرض الشاشة):
//  - wide   (≥1200px): قائمة كاملة بتسميات ومجموعات قابلة للطي، وزر لتصغيرها إلى أيقونات (يُحفظ اختيار المستخدم).
//  - rail   (768–1199px): شريط أيقونات ثابت (تلميح عند المرور)، وزر يوسّعه فوق المحتوى كقائمة منسدلة.
//  - drawer (≤767px): مخفية، تنزلق من الجانب بزر في الترويسة، مع خلفية معتمة وإغلاق بـ Esc أو بالنقر خارجها.
// open/onOpenChange: حالة القائمة المنسدلة (rail/drawer) يتحكم بها الأب لأن زر فتحها في الترويسة.
export default function Sidebar({ activeTab, onChange, can, userKey = 'default', open, onOpenChange }) {
  const isWide = useMediaQuery(`(min-width: ${NAV_WIDE_MIN}px)`);
  const isDrawer = useMediaQuery(`(max-width: ${NAV_DRAWER_MAX}px)`);
  const mode = isWide ? 'wide' : isDrawer ? 'drawer' : 'rail';

  const [state, setState] = useState(() => loadState(userKey));
  const navRef = useRef(null);

  const update = (next) => {
    setState(next);
    try {
      localStorage.setItem(STORE_PREFIX + userKey, JSON.stringify(next));
    } catch {
      /* التخزين غير متاح */
    }
  };

  const overlay = mode !== 'wide' && open; // قائمة منسدلة ظاهرة الآن
  const collapsed = mode === 'wide' && state.collapsed;
  const iconsOnly = collapsed || (mode === 'rail' && !open); // أيقونات بلا تسميات

  // عند التوسّع لعرض كبير تُغلَق القائمة المنسدلة (لا معنى لها هناك)
  useEffect(() => {
    if (mode === 'wide' && open) onOpenChange(false);
  }, [mode, open, onOpenChange]);

  // القائمة المنسدلة: تركيز على العنصر الحالي، حبس التركيز بداخلها، Esc للإغلاق، منع تمرير الصفحة، وإعادة التركيز عند الإغلاق
  useEffect(() => {
    if (!overlay) return undefined;
    const previous = document.activeElement;
    const nav = navRef.current;
    (nav?.querySelector('.nav-item.active') ?? nav?.querySelector('.nav-item'))?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onOpenChange(false);
        return;
      }
      if (e.key !== 'Tab' || !nav) return;
      const focusable = [...nav.querySelectorAll('button')].filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
    };
  }, [overlay, onOpenChange]);

  // إبقاء العنصر النشط ظاهراً داخل القائمة (القائمة الطويلة تتمرّر)
  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector('.nav-item.active');
    if (!nav || !el) return;
    if (el.offsetTop < nav.scrollTop) nav.scrollTop = Math.max(el.offsetTop - 8, 0);
    else if (el.offsetTop + el.offsetHeight > nav.scrollTop + nav.clientHeight) nav.scrollTop = el.offsetTop + el.offsetHeight - nav.clientHeight + 8;
  }, [activeTab, mode, iconsOnly]);

  // نعرض فقط ما يملك المستخدم صلاحيته، ونخفي المجموعة إن لم يبقَ فيها شيء
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(i.id)) })).filter((g) => g.items.length > 0);

  const go = (id) => {
    onChange(id);
    if (overlay) onOpenChange(false);
  };

  const toggleGroup = (id) =>
    update({ ...state, closedGroups: state.closedGroups.includes(id) ? state.closedGroups.filter((g) => g !== id) : [...state.closedGroups, id] });

  // أسهم الأعلى/الأسفل و Home/End للتنقل بين العناصر المرئية
  const onNavKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const items = [...navRef.current.querySelectorAll('.nav-item')].filter((el) => el.offsetParent !== null);
    const index = items.indexOf(document.activeElement);
    if (index < 0) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  };

  // زر الأعلى: يتبدّل حسب الوضع (تصغير/توسيع في الكبير، فتح في الشريط، إغلاق في المنسدلة)
  const topButton = overlay
    ? { Icon: X, label: 'إغلاق القائمة', onClick: () => onOpenChange(false) }
    : mode === 'wide'
      ? { Icon: collapsed ? ChevronsLeft : ChevronsRight, label: collapsed ? 'توسيع القائمة' : 'تصغير القائمة', onClick: () => update({ ...state, collapsed: !state.collapsed }) }
      : { Icon: Menu, label: 'فتح القائمة', onClick: () => onOpenChange(true) };
  const showTopLabel = !iconsOnly; // التسمية تظهر حين تظهر باقي التسميات

  return (
    <>
      <div className={`app-nav-slot app-nav-slot--${mode} ${collapsed ? 'is-collapsed' : ''}`}>
        <nav
          id="app-nav"
          ref={navRef}
          aria-label="التنقل بين الشاشات"
          className={`app-nav app-nav--${mode} ${overlay ? 'is-open' : ''} ${iconsOnly ? 'is-icons' : ''}`}
          onKeyDown={onNavKeyDown}
        >
          <button type="button" className="nav-toggle" onClick={topButton.onClick} aria-label={topButton.label} aria-expanded={mode === 'wide' ? !collapsed : overlay} aria-controls="app-nav" data-label={topButton.label}>
            <topButton.Icon size={18} aria-hidden="true" />
            {showTopLabel && <span className="nav-item-label">{overlay ? 'القائمة' : topButton.label}</span>}
          </button>

          {groups.map((group) => {
            // المجموعة المطويّة تُفتح تلقائياً إن كانت تحوي الشاشة الحالية (لئلا يضيع المستخدم)
            const closed = state.closedGroups.includes(group.id) && !group.items.some((i) => i.id === activeTab);
            return (
              <div key={group.id} className={`nav-group ${closed ? 'closed' : ''}`}>
                {group.title && (
                  <button type="button" className="nav-heading" aria-expanded={!closed} onClick={() => toggleGroup(group.id)}>
                    <span>{group.title}</span>
                    <ChevronDown size={14} className="nav-chevron" aria-hidden="true" />
                  </button>
                )}
                {group.items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`nav-item ${activeTab === id ? 'active' : ''}`}
                    aria-current={activeTab === id ? 'page' : undefined}
                    aria-label={label}
                    data-label={label}
                    onClick={() => go(id)}
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span className="nav-item-label">{label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      </div>

      {overlay && <div className="app-nav-backdrop" onClick={() => onOpenChange(false)} aria-hidden="true" />}
    </>
  );
}
