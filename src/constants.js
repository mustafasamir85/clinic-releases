export const CLINIC_NAME = 'مؤسسة الملكة علياء للسمع والنطق';
export const CLINIC_SUBTITLE = '';
// تذييل الطباعة: يظهر في أسفل كل صفحة مطبوعة. العناصر الفارغة لا تُطبع.
export const CLINIC_ADDRESS = 'عمان - ديرغبار - جبران بن مطعم';
export const CLINIC_PHONES = ['06 581 9141', '+962 778 302 935']; // مثال: ['06 000 0000', '079 000 0000']
export const CLINIC_EMAIL = 'info@qaf.jo';
export const DOCTOR_NAME = '';


export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export const TABS = {
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
  UPDATES: 'updates', // لمدير النظام فقط (لا تُمنح بالصلاحيات)
  BACKUP: 'backup', // لمدير النظام فقط
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
