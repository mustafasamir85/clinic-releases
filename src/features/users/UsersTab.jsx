import { useState } from 'react';
import { UserCog, UserPlus, Users } from 'lucide-react';
import { roleLabel } from '../../auth/permissions';
import { Panel, EditDeleteActions, IconBadge, ListRow, SectionHeader, TabCard } from '../../components/common/layout';
import StatusBadge from '../../components/common/StatusBadge';
import UserModal from './UserModal';

// إدارة المستخدمين والصلاحيات. auth = نتيجة useAuth.
export default function UsersTab({ auth, onNotify }) {
  const [modal, setModal] = useState(null); // null | { user? }
  const { users, currentUser } = auth;

  const handleSave = async (data) => {
    const editing = modal.user;
    const error = await (editing ? auth.updateUser(editing.id, data) : auth.addUser(data));
    if (error) return error;
    onNotify(editing ? 'تم تعديل المستخدم بنجاح!' : 'تمت إضافة المستخدم بنجاح!');
    setModal(null);
    return null;
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`حذف المستخدم "${u.name}" نهائياً؟`)) return;
    const error = await auth.removeUser(u.id);
    onNotify(error ?? 'تم حذف المستخدم.', 4000);
  };

  return (
    <TabCard>
      <SectionHeader
        title="المستخدمون والصلاحيات"
        description="إضافة حسابات الموظفين وتحديد الشاشات والإجراءات المسموحة لكل منهم"
        icon={Users}
        action={
          <button onClick={() => setModal({})} className="btn-warm-primary">
            <UserPlus size={18} /> إضافة مستخدم +
          </button>
        }
      />

      <Panel title={`قائمة المستخدمين (${users.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {users.map((u) => {
          const isSelf = u.id === currentUser.id;
          return (
            <ListRow
              key={u.id}
              leading={<IconBadge icon={UserCog} />}
              title={`${u.name}${isSelf ? ' (أنت)' : ''}`}
              subtitle={`@${u.username} • ${roleLabel(u.role)} • ${u.permissions.length} صلاحية`}
            >
              <StatusBadge tone={u.active ? 'success' : 'danger'}>{u.active ? 'فعّال' : 'معطّل'}</StatusBadge>
              <EditDeleteActions onEdit={() => setModal({ user: u })} onDelete={() => handleDelete(u)} />
            </ListRow>
          );
        })}
      </div>
      </Panel>

      {modal && (
        <UserModal
          user={modal.user}
          actor={currentUser}
          isSelf={modal.user?.id === currentUser.id}
          minPassword={auth.minPassword}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </TabCard>
  );
}
