import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { ACTIONS, ALL_PERMISSIONS, PERMISSION_GROUPS, ROLES } from '../../auth/permissions';
import { TABS } from '../../constants';
import { COLORS, twoColumns } from '../../styles';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';

// إضافة مستخدم أو تعديله. onSave يعيد نص الخطأ إن وُجد (مثل تكرار اسم المستخدم).
const REPORT_SUB = [ACTIONS.REPORTS_ACCOUNTING, ACTIONS.REPORTS_ADMIN, ACTIONS.REPORTS_CASH, ACTIONS.REPORTS_CLAIMS];
const SCREEN_IDS = PERMISSION_GROUPS[0].items.map((i) => i.id);

// actor = المستخدم الذي يعدّل. غير المدير لا يمنح ولا يسحب إلا ما يملكه هو (يطابق فحص الخادم).
export default function UserModal({ user, actor, isSelf, onSave, onClose, minPassword }) {
  const actorIsAdmin = actor?.role === 'admin';
  const initialPerms = user?.permissions ?? [];
  const canGrant = (id) => actorIsAdmin || (actor?.permissions ?? []).includes(id);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    username: user?.username ?? '',
    role: user?.role ?? 'doctor',
    password: '',
    active: user?.active ?? true,
  });
  const [permissions, setPermissions] = useState(user?.permissions ?? ROLES.doctor.permissions);
  const [error, setError] = useState('');
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // اختيار الدور يملأ الصلاحيات بقالبه، ويمكن تعديلها يدوياً بعدها
  const handleRole = (e) => {
    const role = e.target.value;
    setForm((f) => ({ ...f, role }));
    // غير المدير يحصل على الجزء من القالب الذي يملك صلاحية منحه فقط، وما لا يملك سحبه من المستخدم يبقى كما هو
    setPermissions([...new Set([...ROLES[role].permissions.filter(canGrant), ...initialPerms.filter((id) => !canGrant(id))])]);
  };

  const isAdminRole = form.role === 'admin';
  const effective = isAdminRole ? ALL_PERMISSIONS : permissions;

  // الربط بين شاشة التقارير وأقسامها: تفعيل قسم يفتح الشاشة، وإغلاق الشاشة يمسح الأقسام
  const normalize = (list) => {
    let next = list;
    if (REPORT_SUB.some((id) => next.includes(id)) && !next.includes(TABS.REPORTS)) next = [...next, TABS.REPORTS];
    if (!next.includes(TABS.REPORTS)) next = next.filter((id) => !REPORT_SUB.includes(id) || !canGrant(id)); // ما لا يملك المعدِّل سحبه يبقى (فتبقى الشاشة معه)
    if (REPORT_SUB.some((id) => next.includes(id)) && !next.includes(TABS.REPORTS)) next = [...next, TABS.REPORTS];
    return next;
  };

  const locked = (id) => isAdminRole || !canGrant(id) || (isSelf && id === TABS.USERS);

  const toggle = (id) => {
    if (locked(id)) return;
    setPermissions((prev) => normalize(prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  // تحديد/إلغاء كل خيارات مجموعة (ما يسمح به فقط)
  const setGroup = (group, on) => {
    const ids = group.items.map((i) => i.id).filter((id) => !locked(id));
    setPermissions((prev) => normalize(on ? [...new Set([...prev, ...ids])] : prev.filter((p) => !ids.includes(p))));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!effective.some((id) => SCREEN_IDS.includes(id))) {
      setError('اختر شاشة واحدة على الأقل ليتمكن المستخدم من استخدام النظام');
      return;
    }
    const message = await onSave({
      name: form.name.trim(),
      username: form.username.trim(),
      role: form.role,
      permissions: effective,
      active: form.active,
      password: form.password,
    });
    if (message) setError(message);
  };

  return (
    <Modal title={user ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'} icon={UserPlus} maxWidth={640} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={twoColumns}>
          <Field label="الاسم الكامل" required>
            <input type="text" className="warm-input" value={form.name} onChange={setField('name')} required autoFocus />
          </Field>
          <Field label="اسم المستخدم (للدخول)" required>
            <input type="text" className="warm-input" value={form.username} onChange={setField('username')} autoComplete="off" required dir="ltr" style={{ textAlign: 'right' }} />
          </Field>
        </div>

        <div style={{ ...twoColumns, marginTop: '12px' }}>
          <Field label="الدور الوظيفي" required>
            <select className="warm-select" value={form.role} onChange={handleRole} disabled={isSelf || user?.role === 'admin'}>
              {Object.entries(ROLES).filter(([key]) => actorIsAdmin || key !== 'admin' || form.role === 'admin').map(([key, r]) => (
                <option key={key} value={key}>{r.label}</option>
              ))}
            </select>
          </Field>
          <Field label={user ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء)' : 'كلمة المرور'} required={!user}>
            <input type="password" className="warm-input" value={form.password} onChange={setField('password')} autoComplete="new-password" required={!user} minLength={user ? undefined : minPassword} placeholder={`${minPassword} أحرف على الأقل`} />
          </Field>
        </div>

        {isAdminRole && <p style={{ fontSize: '12px', color: COLORS.muted ?? COLORS.text, margin: '14px 0 0 0' }}>مدير النظام يملك جميع الصلاحيات تلقائياً، ولا يمكن لأحد تغيير دوره أو صلاحياته.</p>}
        {!actorIsAdmin && <p style={{ fontSize: '12px', color: COLORS.muted ?? COLORS.text, margin: '10px 0 0 0' }}>الخيارات المعطّلة صلاحيات لا تملكها أنت، فلا يمكنك منحها ولا سحبها.</p>}

        {PERMISSION_GROUPS.map((group) => {
          const count = group.items.filter((i) => effective.includes(i.id)).length;
          const editable = group.items.some((i) => !locked(i.id));
          return (
            <div key={group.title} style={{ marginTop: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '13px', color: COLORS.ink }}>
                  {group.title} <small style={{ fontWeight: 500, opacity: 0.65 }}>({count}/{group.items.length})</small>
                </strong>
                {editable && (
                  <span style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                    <button type="button" className="link-button" onClick={() => setGroup(group, true)}>تحديد الكل</button>
                    <button type="button" className="link-button" onClick={() => setGroup(group, false)}>مسح الكل</button>
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '6px 16px', marginTop: '8px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '12px' }}>
                {group.items.map((item) => {
                  const off = locked(item.id);
                  return (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: COLORS.text, cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.6 : 1 }}>
                      <input type="checkbox" checked={effective.includes(item.id)} disabled={off} onChange={() => toggle(item.id)} />
                      {item.label}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '13px', color: COLORS.text, cursor: isSelf ? 'not-allowed' : 'pointer' }}>
          <input type="checkbox" checked={form.active} disabled={isSelf} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
          الحساب فعّال {isSelf && '(لا يمكنك تعطيل حسابك)'}
        </label>

        {error && <p style={{ color: COLORS.danger, fontSize: '13px', fontWeight: '700', margin: '12px 0 0 0' }} role="alert">{error}</p>}

        <FormActions onCancel={onClose} submitLabel={user ? 'حفظ التعديلات' : 'إضافة المستخدم'} />
      </form>
    </Modal>
  );
}
