export const CLINIC_NAME = 'مؤسسة الملكة علياء للسمع والنطق';
export const CLINIC_NAME_ENGLISH = 'Queen Alia Foundation'
export const CLINIC_SUBTITLE = 'For Hearing & Speech';
// تذييل الطباعة: يظهر في أسفل كل صفحة مطبوعة. العناصر الفارغة لا تُطبع.
export const CLINIC_ADDRESS = 'عمان - ديرغبار - جبير بن مطعم';
export const CLINIC_ADDRESS_ENGLISH = 'Amman - Dair Ghbar - Jubair Bin Mut\'im St.'; // تُعرض في تذييل الوثائق الإنجليزية (عدّلها إن لزم)
export const CLINIC_PHONES = ['06 581 9141', '+962 778 302 935']; // مثال: ['06 000 0000', '079 000 0000']
export const CLINIC_EMAIL = 'info@qaf.jo';
export const DOCTOR_NAME = '';


export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export const TABS = {
  HOME: 'home', // الصفحة الرئيسية (لوحة اليوم): متاحة لكل مستخدم مسجَّل، ولا تحتاج صلاحية
  PATIENTS: 'patients',
  ENT: 'ent',
  AUDIO: 'audio',
  SPEECH: 'speech',
  SERVICES: 'services',
  SUPPLIES: 'supplies',
  SALES: 'sales',
  SUPPLIERS: 'suppliers',
  PURCHASES: 'purchases',
  INSURANCE: 'insurance',
  SCHEDULE: 'schedule',
  BILLING: 'billing',
  REPORTS: 'reports',
  USERS: 'users',
  UPDATES: 'updates', // مدير النظام + من منحه المدير الصلاحية
  BACKUP: 'backup', // لمدير النظام فقط
  ANNOUNCEMENTS: 'announcements', // رسائل لجميع المستخدمين: لمدير النظام فقط
  OFFERS: 'offers',
};

export const DEPARTMENTS = {
  ENT: 'الأنف والأذن',
  AUDIO: 'السمعيات',
  SPEECH: 'التخاطب',
};

export const APPOINTMENT_STATUS = {
  BOOKED: 'محجوز',
  ARRIVED: 'وصل',
  DONE: 'مكتمل',
  CANCELLED: 'ملغي',
};

export const INVOICE_STATUS = {
  PAID: 'مدفوع بالكامل',
  PARTIAL: 'متبقي دفعة',
  PENDING: 'بانتظار تأكيد الدفع',
};

// طرق الدفع: الدفعات القديمة بلا طريقة مسجَّلة تُعدّ نقدية
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
};
export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.CASH]: 'نقدي',
  [PAYMENT_METHODS.CARD]: 'بطاقة بنكية',
};
export const DEFAULT_PAYMENT_METHOD = PAYMENT_METHODS.CASH;
export const paymentMethodLabel = (method) => PAYMENT_METHOD_LABELS[method] ?? PAYMENT_METHOD_LABELS[DEFAULT_PAYMENT_METHOD];

export const INSURANCE_STATUS = {
  APPROVED: 'معتمد',
  REVIEW: 'تحت المراجعة',
  SUSPENDED: 'موقوف',
};

export const HEARING_AID_TYPES = ['RIC', 'BTE', 'ITE', 'CIC'];
export const SUPPLY_UNITS = ['قطعة', 'علبة', 'باكيت', 'زجاجة'];
export const LOW_STOCK_THRESHOLD = 10;

export const DEFAULT_MEDICAL_HISTORY = 'لا يوجد تاريخ مرضي مسجل.';
export const DEFAULT_USAGE = 'حسب إرشادات الطبيب';
