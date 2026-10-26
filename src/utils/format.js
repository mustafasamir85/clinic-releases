// أدوات التنسيق والحساب المشتركة

// تاريخ اليوم المحلي بصيغة YYYY-MM-DD (toISOString يعتمد UTC وقد يعطي يوم أمس بعد منتصف الليل)
export const getToday = () => new Date().toLocaleDateString('en-CA');

export const formatDateDMY = (dateString) => {
  if (!dateString) return 'غير محدد';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateString;
};

export const calculateAge = (birthDateString) => {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
};

export const formatMoney = (amount) => {
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(Number(amount))) {
    return 'غير محدد';
  }
  return `${Number(amount)} د.أ`;
};

export const getFileNumber = (patient) => patient?.file_number || '—';

// "14:30" -> "02:30 م"
export const formatTime12 = (time) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`;
};

// اسم المستخدم للعرض: "الاسم (اسم الدخول)" أو أيٌّ منهما إن غاب الآخر أو تطابقا
export const formatUser = (name, username) => (name && username && name !== username ? `${name} (${username})` : name || username || '');
