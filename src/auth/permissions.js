import { TABS } from '../constants';

// صلاحيات الشاشات (معرّف الصلاحية = معرّف التبويب) وصلاحيات الإجراءات
export const ACTIONS = {
  MANAGE_VISITS: 'visits.manage', // تعديل وحذف الزيارات
  CONFIRM_PAYMENT: 'invoices.confirm', // تأكيد دفع الفواتير
  EDIT_INVOICES: 'invoices.edit', // تعديل بنود الفواتير
  DELETE_INVOICES: 'invoices.delete', // حذف الفواتير
  ISSUE_DOCUMENTS: 'documents.issue', // إصدار التقارير الطبية والإجازات المرضية
  DELETE_DOCUMENTS: 'documents.delete', // حذف التقارير الطبية والإجازات المرضية
  // أقسام شاشة التقارير (شاشة التقارير تفتح الصفحة، وهذه تحدد ما يظهر فيها)
  REPORTS_ACCOUNTING: 'reports.accounting', // التقارير المحاسبية
  REPORTS_ADMIN: 'reports.admin', // التقارير الإدارية (ومنها قائمة المرضى)
  REPORTS_CASH: 'reports.cash', // معاينة الكشف النقدي
  REPORTS_CLAIMS: 'reports.claims', // مطالبات شركات التأمين
};

export const PERMISSION_GROUPS = [
  {
    title: 'الشاشات المسموح بفتحها',
    items: [
      { id: TABS.PATIENTS, label: 'سجل المرضى (EMR)' },
      { id: TABS.ENT, label: 'الأنف والأذن' },
      { id: TABS.AUDIO, label: 'السمعيات والسماعات' },
      { id: TABS.SPEECH, label: 'جلسات التخاطب' },
      { id: TABS.SCHEDULE, label: 'جدول المواعيد' },
      { id: TABS.SERVICES, label: 'الإجراءات والخدمات' },
      { id: TABS.OFFERS, label: 'قائمة العروض' },
      { id: TABS.SUPPLIES, label: 'المستلزمات الطبية' },
      { id: TABS.SALES, label: 'بيع المستلزمات' },
      { id: TABS.SUPPLIERS, label: 'الموردين' },
      { id: TABS.PURCHASES, label: 'المشتريات' },
      { id: TABS.INSURANCE, label: 'التأمينات الطبية' },
      { id: TABS.BILLING, label: 'الفواتير والحسابات' },
      { id: TABS.REPORTS, label: 'التقارير' },
      { id: TABS.USERS, label: 'إدارة المستخدمين والصلاحيات' },
      { id: TABS.UPDATES, label: 'تحديث البرنامج'  },
      { id: TABS.BACKUP, label: 'اخذ نسخه احتياطيه'}

    ],
  },
  {
    title: 'صلاحيات الإجراءات',
    items: [
      { id: ACTIONS.MANAGE_VISITS, label: 'تعديل وحذف الزيارات' },
      { id: ACTIONS.CONFIRM_PAYMENT, label: 'تأكيد دفع الفواتير' },
      { id: ACTIONS.EDIT_INVOICES, label: 'تعديل بنود الفواتير' },
      { id: ACTIONS.DELETE_INVOICES, label: 'حذف الفواتير' },
      { id: ACTIONS.ISSUE_DOCUMENTS, label: 'إصدار التقارير الطبية والإجازات المرضية' },
      { id: ACTIONS.DELETE_DOCUMENTS, label: 'حذف التقارير الطبية والإجازات المرضية' },
    ],
  },
  {
    title: 'صلاحيات التقارير (مع السماح بشاشة التقارير)',
    items: [
      { id: ACTIONS.REPORTS_ACCOUNTING, label: 'التقارير المحاسبية' },
      { id: ACTIONS.REPORTS_ADMIN, label: 'التقارير الإدارية وقائمة المرضى' },
      { id: ACTIONS.REPORTS_CASH, label: 'معاينة الكشف النقدي' },
      { id: ACTIONS.REPORTS_CLAIMS, label: 'مطالبات شركات التأمين' },
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.id));

// ترتيب الشاشات (لاختيار أول شاشة مسموحة بعد الدخول)
export const TAB_ORDER = PERMISSION_GROUPS[0].items.map((i) => i.id);

// الأدوار: قوالب جاهزة للصلاحيات، ويمكن تعديل صلاحيات كل مستخدم بعد اختيار الدور
export const ROLES = {
  admin: { label: 'مدير النظام', permissions: ALL_PERMISSIONS },
  manager: {
  label: 'المدير',
  permissions: [TABS.PATIENTS, TABS.ENT, TABS.AUDIO, TABS.SPEECH, TABS.SCHEDULE, ACTIONS.MANAGE_VISITS, ACTIONS.ISSUE_DOCUMENTS, ACTIONS.DELETE_DOCUMENTS],
  },
  doctor: {
    label: 'طبيب / أخصائي',
    permissions: [TABS.PATIENTS, TABS.ENT, TABS.AUDIO, TABS.SPEECH, TABS.SCHEDULE, ACTIONS.MANAGE_VISITS, ACTIONS.ISSUE_DOCUMENTS, ACTIONS.DELETE_DOCUMENTS],
  },
  reception: {
    label: 'استقبال',
    permissions: [TABS.PATIENTS, TABS.SCHEDULE, TABS.BILLING, TABS.SALES, ACTIONS.CONFIRM_PAYMENT],
  },
  accountant: {
    label: 'محاسب',
    permissions: [
      TABS.BILLING, TABS.SALES, TABS.OFFERS, TABS.INSURANCE, TABS.PURCHASES, TABS.REPORTS,
      ACTIONS.CONFIRM_PAYMENT, ACTIONS.EDIT_INVOICES,
      ACTIONS.REPORTS_ACCOUNTING, ACTIONS.REPORTS_ADMIN, ACTIONS.REPORTS_CASH, ACTIONS.REPORTS_CLAIMS,
    ],
  },
  storekeeper: {
    label: 'أمين مخزن',
    permissions: [TABS.SUPPLIES, TABS.SALES, TABS.SUPPLIERS, TABS.PURCHASES],
  },
};

export const roleLabel = (role) => ROLES[role]?.label ?? 'مخصّص';
