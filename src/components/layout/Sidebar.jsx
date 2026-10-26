import { useState } from 'react';
import { BarChart3, ChevronDown, Cloud, ChevronsLeft, ChevronsRight, RefreshCw, Menu, Briefcase, Calendar, DollarSign, Ear, FileText, Mic, Package, Shield, ShoppingCart, Store, Tag, Truck, User, Users } from 'lucide-react';
import { TABS } from '../../constants';

const MENU = [
  {
    title: 'الأقسام الطبية',
    items: [
      { id: TABS.PATIENTS, label: 'سجل المرضى (EMR)', icon: User },
      { id: TABS.ENT, label: 'الأنف والأذن (ENT)', icon: FileText },
      { id: TABS.AUDIO, label: 'السمعيات والسماعات', icon: Ear },
      { id: TABS.SPEECH, label: 'جلسات التخاطب', icon: Mic },
    ],
  },
  {
    title: 'الإدارة والمالية',
    items: [
      { id: TABS.SERVICES, label: 'الإجراءات والخدمات', icon: Briefcase },
      { id: TABS.OFFERS, label: 'قائمة العروض', icon: Tag },
      { id: TABS.SUPPLIES, label: 'المستلزمات الطبية', icon: Package },
      { id: TABS.SALES, label: 'بيع المستلزمات', icon: Store },
      { id: TABS.SUPPLIERS, label: 'الموردين', icon: Truck },
      { id: TABS.PURCHASES, label: 'المشتريات', icon: ShoppingCart },
      { id: TABS.INSURANCE, label: 'التأمينات الطبية', icon: Shield },
      { id: TABS.SCHEDULE, label: 'جدول المواعيد', icon: Calendar },
      { id: TABS.BILLING, label: 'الفواتير والحسابات', icon: DollarSign },
      { id: TABS.REPORTS, label: 'التقارير', icon: BarChart3 },
      { id: TABS.USERS, label: 'المستخدمون والصلاحيات', icon: Users },
      { id: TABS.BACKUP, label: 'النسخ الاحتياطي', icon: Cloud },
      { id: TABS.UPDATES, label: 'تحديثات التطبيق', icon: RefreshCw },
    ],
  },
];

// حالة الطيّ تُحفظ في المتصفح؛ أي فشل في التخزين لا يؤثر على عمل القائمة
const STORE_KEY = 'sidebar-state-v1';
function loadState() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY));
    return { rail: Boolean(v?.rail), closedGroups: Array.isArray(v?.closedGroups) ? v.closedGroups : [] };
  } catch {
    return { rail: false, closedGroups: [] };
  }
}

export default function Sidebar({ activeTab, onChange, can }) {
  // على الموبايل تُطوى القائمة خلف زر يعرض اسم الشاشة الحالية (على الشاشات الكبيرة يُخفى الزر وتظهر القائمة دائماً)
  const [open, setOpen] = useState(false);
  // rail: القائمة كلها مطويّة (تتّسع منطقة العمل) — closedGroups: المجموعات المطويّة داخلها
  const [{ rail, closedGroups }, setState] = useState(loadState);
  const update = (next) => {
    setState(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* التخزين غير متاح */ }
  };
  const toggleRail = () => update({ rail: !rail, closedGroups });
  const toggleGroup = (title) =>
    update({ rail, closedGroups: closedGroups.includes(title) ? closedGroups.filter((t) => t !== title) : [...closedGroups, title] });
  // نعرض فقط ما يملك المستخدم صلاحيته، ونخفي المجموعة إن لم يبقَ فيها شيء
  const groups = MENU.map((g) => ({ ...g, items: g.items.filter((i) => can(i.id)) })).filter((g) => g.items.length > 0);

  const current = groups.flatMap((g) => g.items).find((i) => i.id === activeTab);

  return (
    <aside className={`warm-sidebar ${open ? 'open' : ''} ${rail ? 'rail' : ''}`}>
      <button type="button" className="warm-sidebar-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Menu size={18} />
        <span className="warm-sidebar-toggle-label">{current?.label ?? 'القائمة'}</span>
        <ChevronDown size={18} className="warm-sidebar-chevron" />
      </button>

      <button
        type="button"
        className="warm-sidebar-collapse"
        aria-expanded={!rail}
        onClick={toggleRail}
        title={rail ? 'توسيع القائمة' : 'تصغير القائمة'}
      >
        {rail ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
        <span className="warm-label">{rail ? 'توسيع القائمة' : 'تصغير القائمة'}</span>
      </button>

      <div className="warm-sidebar-body">
      {groups.map((group) => {
        const closed = closedGroups.includes(group.title);
        return (
        <div key={group.title} className={`warm-sidebar-group ${closed ? 'closed' : ''}`}>
          <button type="button" className="warm-sidebar-heading" aria-expanded={!closed} onClick={() => toggleGroup(group.title)}>
            <span>{group.title}</span>
            <ChevronDown size={14} className="warm-group-chevron" />
          </button>
          {group.items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onChange(id); setOpen(false); }}
              className={`warm-menu-btn ${activeTab === id ? 'active' : ''}`}
              title={label}
            >
              <Icon size={18} /> <span className="warm-label">{label}</span>
            </button>
          ))}
        </div>
        );
      })}
      </div>
    </aside>
  );
}