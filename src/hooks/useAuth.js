import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { ALL_PERMISSIONS, TAB_ORDER } from '../auth/permissions';

const MIN_PASSWORD = 8; // يطابق MIN_PASSWORD في الخادم (config.py)

// المدير يملك دائماً كل الصلاحيات، ومنها ما أُضيف بعد حفظ حسابه
const withPermissions = (u) => (u.role === 'admin' ? { ...u, permissions: ALL_PERMISSIONS } : u);

// تسجيل الدخول والمستخدمون عبر الـ API. التحقق من الهوية والصلاحيات يتم على السيرفر،
// وما تفعله الواجهة هنا (إخفاء الشاشات) للعرض فقط.
// دوال التعديل async وتعيد نص الخطأ أو null عند النجاح (login تعيد { ok, error }).
export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [ready, setReady] = useState(() => !api.getToken()); // false أثناء التحقق من جلسة محفوظة

  const isManager = Boolean(currentUser?.permissions.includes('users'));

  // استعادة الجلسة عند فتح الصفحة
  useEffect(() => {
    if (!api.getToken()) return;
    api
      .getMe()
      .then((u) => setCurrentUser(withPermissions(u)))
      .catch(() => api.setToken(null))
      .finally(() => setReady(true));
  }, []);

  const logout = useCallback(() => {
    api.setToken(null);
    setCurrentUser(null);
    setUsers([]);
  }, []);

  // انتهاء الجلسة أو تعطيل الحساب أثناء العمل: عودة لشاشة الدخول
  useEffect(() => {
    window.addEventListener('clinic-unauthorized', logout);
    return () => window.removeEventListener('clinic-unauthorized', logout);
  }, [logout]);

  const loadUsers = useCallback(async () => {
    try {
      setUsers((await api.getUsers()).map(withPermissions));
    } catch {
      /* يظهر الخطأ عبر رسالة المزامنة العامة إن لزم */
    }
  }, []);

  // قائمة المستخدمين تُحمَّل لمن يملك صلاحية الإدارة فقط
  useEffect(() => {
    if (isManager) loadUsers();
  }, [isManager, loadUsers]);

  const can = useCallback((permission) => Boolean(currentUser?.permissions.includes(permission)), [currentUser]);
  const firstAllowedTab = useMemo(() => TAB_ORDER.find((t) => can(t)) ?? null, [can]);

  const login = useCallback(async (username, password) => {
    try {
      const { token, user } = await api.login(username, password);
      api.setToken(token);
      setCurrentUser(withPermissions(user));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }, []);

  // ===== إدارة المستخدمين =====
  const addUser = useCallback(
    async (data) => {
      if (!data.password || data.password.length < MIN_PASSWORD) return `كلمة المرور ${MIN_PASSWORD} أحرف على الأقل.`;
      try {
        await api.createUser(data);
        await loadUsers();
        return null;
      } catch (err) {
        return err.message;
      }
    },
    [loadUsers]
  );

  const updateUser = useCallback(
    async (id, { password, ...changes }) => {
      if (password && password.length < MIN_PASSWORD) return `كلمة المرور ${MIN_PASSWORD} أحرف على الأقل.`;
      try {
        await api.updateUser(id, { ...changes, ...(password ? { password } : {}) });
        await loadUsers();
        // تعديل المستخدم لنفسه (الاسم/الصلاحيات) ينعكس فوراً
        if (id === currentUser?.id) setCurrentUser(withPermissions(await api.getMe()));
        return null;
      } catch (err) {
        return err.message;
      }
    },
    [loadUsers, currentUser]
  );

  const removeUser = useCallback(
    async (id) => {
      try {
        await api.deleteUser(id);
        await loadUsers();
        return null;
      } catch (err) {
        return err.message;
      }
    },
    [loadUsers]
  );

  // تغيير كلمة مرور المستخدم الحالي (إجباري للحساب الافتراضي)
  const changeOwnPassword = useCallback(async (password) => {
    if (!password || password.length < MIN_PASSWORD) return `كلمة المرور ${MIN_PASSWORD} أحرف على الأقل.`;
    try {
      setCurrentUser(withPermissions(await api.changePassword(password)));
      return null;
    } catch (err) {
      return err.message;
    }
  }, []);

  return { ready, users, currentUser, can, firstAllowedTab, login, logout, addUser, updateUser, removeUser, changeOwnPassword, minPassword: MIN_PASSWORD };
}
