import axios from 'axios';
import { API_BASE_URL } from './constants';

const TOKEN_KEY = 'clinic-token';
let tokenGeneration = 0;

export const getToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  tokenGeneration += 1;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* التخزين غير متاح */
  }
};

// خطأ من السيرفر: message جاهزة للعرض للمستخدم، وstatus رمز HTTP (0 = تعذر الاتصال)
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// عميل axios واحد: العنوان الأساسي ورأس التفويض يُضافان تلقائياً لكل طلب
const http = axios.create({ baseURL: API_BASE_URL });

http.interceptors.request.use((config) => {
  const token = getToken();
  // نحفظ الرمز ورقم "جيل" الجلسة وقت الإرسال لنعرف عند الفشل هل ما زالت الجلسة نفسها
  config.metadata = { token, generation: tokenGeneration };
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// يحوّل أخطاء axios إلى ApiError برسالة جاهزة للعرض (status = 0 عند تعذر الاتصال)
function toApiError(error) {
  if (!error.response) {
    return new ApiError('تعذر الاتصال بالخادم. تأكد من تشغيله ثم أعد المحاولة.', 0);
  }
  const { status, data } = error.response;
  let detail = `خطأ ${status}`;
  if (typeof data?.detail === 'string') detail = data.detail;
  else if (Array.isArray(data?.detail)) detail = 'بيانات غير صالحة.';

  // انتهاء الجلسة: تُنبَّه الواجهة لتعيد المستخدم إلى شاشة الدخول
  const meta = error.config?.metadata;
  if (status === 401 && meta?.token && meta.generation === tokenGeneration && meta.token === getToken()) {
    window.dispatchEvent(new Event('clinic-unauthorized'));
  }
  return new ApiError(detail, status);
}

// FormData (رفع ملف): axios يضبط Content-Type مع الـ boundary بنفسه
async function request(path, { method = 'GET', body } = {}) {
  try {
    const res = await http.request({ url: path, method, data: body });
    return res.status === 204 ? null : res.data;
  } catch (error) {
    throw toApiError(error);
  }
}

// ===== الدخول =====
export const login = (username, password) => request('/auth/login', { method: 'POST', body: { username, password } });
export const getMe = () => request('/auth/me');
export const changePassword = (password) => request('/auth/change-password', { method: 'POST', body: { password } });

// ===== المستخدمون =====
export const getUsers = () => request('/users');
export const createUser = (user) => request('/users', { method: 'POST', body: user });
export const updateUser = (id, changes) => request(`/users/${id}`, { method: 'PUT', body: changes });
export const deleteUser = (id) => request(`/users/${id}`, { method: 'DELETE' });

// ===== البيانات (مجموعات) =====
// استيراد قاعدة الأدوية من ملف CSV/XLSX. يعيد { ok, imported, updated, skipped }
export const importMedications = (file) => {
  const form = new FormData();
  form.append('file', file);
  return request('/data/medications/import', { method: 'POST', body: form });
};
export const getCollection = (name) => request(`/data/${name}`);
export const syncCollection = (name, upsert, remove) =>
  request(`/data/${name}/sync`, { method: 'PUT', body: { upsert, delete: remove } });

// ===== تحديث التطبيق (مدير النظام) =====
export const getVersion = () => request('/version');
export const getUpdateStatus = () => request('/update/status');
export const checkUpdate = () => request('/update/check', { method: 'POST' });
export const applyUpdate = () => request('/update/apply', { method: 'POST' });
export const rollbackUpdate = () => request('/update/rollback', { method: 'POST' });

// ===== النسخ الاحتياطي إلى Google Drive (مدير النظام) =====
export const getBackupStatus = () => request('/backup/status');
export const saveBackupSettings = (settings) => request('/backup/settings', { method: 'PUT', body: settings });
export const startBackupConnect = () => request('/backup/connect', { method: 'POST' });
export const pollBackupConnect = () => request('/backup/connect/poll', { method: 'POST' });
export const disconnectBackup = () => request('/backup/disconnect', { method: 'POST' });
export const runBackupNow = () => request('/backup/run', { method: 'POST' });
