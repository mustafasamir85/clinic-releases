import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BarChart3, Briefcase, Calendar, ChevronDown, Cloud, DollarSign, Ear, FileText, Home, Mic, MoreHorizontal, Package, RefreshCw, Shield, ShoppingCart, Store, Tag, Truck, User, Users } from 'lucide-react';
import { TABS } from '../../constants';

// كل الشاشات بترتيب الأولوية: تُعرض في الشريط ما دام فيه مكان، والباقي يدخل قائمة «المزيد»
const ALL_TABS = [
  { id: TABS.HOME, label: 'الرئيسية', icon: Home },
  { id: TABS.PATIENTS, label: 'المرضى', icon: User },
  { id: TABS.ENT, label: 'الأنف والأذن', icon: FileText },
  { id: TABS.AUDIO, label: 'السمعيات', icon: Ear },
  { id: TABS.SPEECH, label: 'التخاطب', icon: Mic },
  { id: TABS.SCHEDULE, label: 'المواعيد', icon: Calendar },
  { id: TABS.BILLING, label: 'الفواتير', icon: DollarSign },
  { id: TABS.SERVICES, label: 'الإجراءات والخدمات', icon: Briefcase },
  { id: TABS.OFFERS, label: 'العروض', icon: Tag },
  { id: TABS.SUPPLIES, label: 'المستلزمات الطبية', icon: Package },
  { id: TABS.SALES, label: 'بيع المستلزمات', icon: Store },
  { id: TABS.SUPPLIERS, label: 'الموردين', icon: Truck },
  { id: TABS.PURCHASES, label: 'المشتريات', icon: ShoppingCart },
  { id: TABS.INSURANCE, label: 'التأمينات الطبية', icon: Shield },
  { id: TABS.REPORTS, label: 'التقارير', icon: BarChart3 },
  { id: TABS.USERS, label: 'المستخدمون والصلاحيات', icon: Users },
  { id: TABS.BACKUP, label: 'النسخ الاحتياطي', icon: Cloud },
  { id: TABS.UPDATES, label: 'تحديثات التطبيق', icon: RefreshCw },
];

// تُستعمل أيضاً في لوحة البحث الشامل
export const NAV_TABS = ALL_TABS;

const TAB_GAP = 6; // نفس gap في .app-tabbar-list
const NAV_GAP = 8; // نفس gap في .app-tabbar

// شريط تبويبات أفقي. can(id) يحدد ما يملك المستخدم صلاحيته؛ ما لا يملكه يُخفى.
// تُعرض الشاشات المتاحة في الشريط حتى يمتلئ، وما لا يتسع له يدخل قائمة «المزيد».
export default function TabBar({ activeTab, onChange, can }) {
  const [open, setOpen] = useState(false);
  const [visibleIds, setVisibleIds] = useState(null); // null = لم يُقَس العرض بعد
  const navRef = useRef(null);
  const measureRef = useRef(null);
  const moreRef = useRef(null);

  const tabs = ALL_TABS.filter((t) => can(t.id));
  const tabsKey = tabs.map((t) => t.id).join('|');
  const tabsRef = useRef(tabs); // can() يتغيّر مرجعه كل رسم؛ نعتمد على tabsKey لإعادة القياس
  tabsRef.current = tabs;

  // إغلاق القائمة بالضغط خارجها أو بمفتاح Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!moreRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // قياس عرض كل تبويب (من طبقة قياس مخفية) ثم تحديد ما يتسع له الشريط
  const recompute = useCallback(() => {
    const nav = navRef.current;
    const meas = measureRef.current;
    if (!nav || !meas) return;
    const cs = getComputedStyle(nav);
    const avail = nav.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const items = [...meas.querySelectorAll('[data-tab-id]')];
    const widths = new Map(items.map((el) => [el.dataset.tabId, el.getBoundingClientRect().width]));
    const moreEl = meas.querySelector('[data-more]');
    const moreW = moreEl ? moreEl.getBoundingClientRect().width : 0;
    const ids = tabsRef.current.map((t) => t.id);

    const total = ids.reduce((sum, id) => sum + widths.get(id), 0) + TAB_GAP * Math.max(ids.length - 1, 0);
    let next = ids;
    if (total > avail) {
      // لا يتسع الكل: نحجز مكان «المزيد»، ونضمن بقاء التبويب النشط ظاهراً
      let room = avail - moreW - NAV_GAP;
      const pinned = ids.includes(activeTab) ? activeTab : null;
      if (pinned) room -= widths.get(pinned) + TAB_GAP;
      const fitted = [];
      for (const id of ids) {
        if (id === pinned) continue;
        const w = widths.get(id) + (fitted.length ? TAB_GAP : 0);
        if (w > room) break;
        fitted.push(id);
        room -= w;
      }
      // يحافظ على الترتيب الأصلي للتبويبات الظاهرة
      const shown = new Set(pinned ? [...fitted, pinned] : fitted);
      next = ids.filter((id) => shown.has(id));
    }
    setVisibleIds((prev) => (prev && prev.length === next.length && prev.every((id, i) => id === next[i]) ? prev : next));
  }, [tabsKey, activeTab]);

  useLayoutEffect(() => {
    recompute();
    const ro = new ResizeObserver(recompute);
    if (navRef.current) ro.observe(navRef.current);
    if (measureRef.current) ro.observe(measureRef.current); // يتغيّر عند تحميل الخطوط
    document.fonts?.ready?.then(recompute);
    return () => ro.disconnect();
  }, [recompute, tabsKey]);

  const shownSet = new Set(visibleIds ?? tabs.map((t) => t.id));
  const main = tabs.filter((t) => shownSet.has(t.id));
  const more = tabs.filter((t) => !shownSet.has(t.id));

  const go = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <nav className="app-tabbar" aria-label="التنقل بين الشاشات" ref={navRef}>
      <div className="app-tabbar-list">
        {main.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={`app-tab ${activeTab === id ? 'active' : ''}`} aria-current={activeTab === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon size={17} /> <span>{label}</span>
          </button>
        ))}
      </div>

      {more.length > 0 && (
        <div className="app-tabbar-more" ref={moreRef}>
          <button type="button" className="app-tab" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
            <MoreHorizontal size={17} />
            <span>المزيد</span>
            <ChevronDown size={15} className={open ? 'app-tab-chevron open' : 'app-tab-chevron'} />
          </button>
          {open && (
            <div className="app-tabbar-menu" role="menu">
              {more.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" role="menuitem" className={`app-tabbar-item ${activeTab === id ? 'active' : ''}`} onClick={() => go(id)}>
                  <Icon size={16} /> <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* طبقة قياس مخفية: تحوي كل التبويبات وزر «المزيد» لمعرفة عرض كل منها */}
      <div className="app-tabbar-measure" ref={measureRef} aria-hidden="true">
        {tabs.map(({ id, label, icon: Icon }) => (
          <span key={id} data-tab-id={id} className="app-tab">
            <Icon size={17} /> <span>{label}</span>
          </span>
        ))}
        <span data-more className="app-tab">
          <MoreHorizontal size={17} /> <span>المزيد</span> <ChevronDown size={15} />
        </span>
      </div>
    </nav>
  );
}
