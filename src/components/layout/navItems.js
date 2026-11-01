import { BarChart3, Briefcase, Calendar, Cloud, Megaphone, DollarSign, Ear, FileText, Home, Mic, Package, RefreshCw, Shield, ShoppingCart, Store, Tag, Truck, User, Users } from 'lucide-react';
import { TABS } from '../../constants';

// عناصر التنقل مجمّعة للقائمة الجانبية. ما لا يملك المستخدم صلاحيته يُخفى، والمجموعة الفارغة تُخفى كلها.
// title: null = مجموعة بلا عنوان (الرئيسية).
export const NAV_GROUPS = [
  { id: 'main', title: null, items: [{ id: TABS.HOME, label: 'الرئيسية', icon: Home }] },
  {
    id: 'clinical',
    title: 'الأقسام الطبية',
    items: [
      { id: TABS.PATIENTS, label: 'المرضى', icon: User },
      { id: TABS.ENT, label: 'الأنف والأذن', icon: FileText },
      { id: TABS.AUDIO, label: 'السمعيات', icon: Ear },
      { id: TABS.SPEECH, label: 'التخاطب', icon: Mic },
      { id: TABS.SCHEDULE, label: 'المواعيد', icon: Calendar },
    ],
  },
  {
    id: 'stock',
    title: 'المبيعات والمخزون',
    items: [
      { id: TABS.SALES, label: 'بيع المستلزمات', icon: Store },
      { id: TABS.SUPPLIES, label: 'المستلزمات الطبية', icon: Package },
      { id: TABS.PURCHASES, label: 'المشتريات', icon: ShoppingCart },
      { id: TABS.SUPPLIERS, label: 'الموردين', icon: Truck },
    ],
  },
  {
    id: 'finance',
    title: 'المالية',
    items: [
      { id: TABS.BILLING, label: 'الفواتير', icon: DollarSign },
      { id: TABS.INSURANCE, label: 'التأمينات الطبية', icon: Shield },
      { id: TABS.REPORTS, label: 'التقارير', icon: BarChart3 },
    ],
  },
  {
    id: 'settings',
    title: 'الإعدادات والإدارة',
    items: [
      { id: TABS.SERVICES, label: 'الإجراءات والخدمات', icon: Briefcase },
      { id: TABS.OFFERS, label: 'العروض', icon: Tag },
      { id: TABS.USERS, label: 'المستخدمون والصلاحيات', icon: Users },
      { id: TABS.ANNOUNCEMENTS, label: 'رسائل للمستخدمين', icon: Megaphone },
      { id: TABS.BACKUP, label: 'النسخ الاحتياطي', icon: Cloud },
      { id: TABS.UPDATES, label: 'تحديثات التطبيق', icon: RefreshCw },
    ],
  },
];

// قائمة مسطّحة (تُستعمل في لوحة البحث الشامل)
export const NAV_TABS = NAV_GROUPS.flatMap((g) => g.items);

// نقاط التحوّل بين الأوضاع (px). تُستعمل في Sidebar؛ وCSS زرّ القائمة في الترويسة يطابق قيمة drawer-1.
//  wide   >= 1200 : قائمة كاملة ثابتة (قابلة للتصغير إلى أيقونات)
//  rail   768–1199: شريط أيقونات ثابت، يتوسّع فوق المحتوى بنقرة
//  drawer <= 767  : مخفية، تنزلق من الجانب بزر في الترويسة
export const NAV_WIDE_MIN = 1200;
export const NAV_DRAWER_MAX = 767;
