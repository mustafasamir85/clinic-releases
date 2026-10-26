import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Panel, ListRow, IconBadge, EditDeleteActions, SectionHeader, TabCard } from './layout';

// قالب موحّد لأقسام الإدارة (الخدمات، المستلزمات، التأمينات):
// عنوان + زر إضافة + قائمة صفوف مع تعديل/حذف ونافذة إدخال.
//  - getRow(item) => { title, subtitle, side }
//  - renderModal({ item, onSave, onClose }) => عنصر النافذة (item = null عند الإضافة)
//  - messages: { added, updated, deleted }
export default function ManagedListTab({
  title,
  description,
  addLabel,
  icon,
  list,
  getRow,
  renderModal,
  messages,
  onNotify,
  extraActions,
}) {
  const [modal, setModal] = useState({ open: false, item: null });
  const close = () => setModal({ open: false, item: null });

  const handleSave = (data) => {
    if (modal.item) {
      list.update(modal.item.id, data);
      onNotify(messages.updated);
    } else {
      list.add(data);
      onNotify(messages.added);
    }
    close();
  };

  const handleDelete = (id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    list.remove(id);
    onNotify(messages.deleted);
  };

  return (
    <TabCard>
      <SectionHeader
        title={title}
        description={description}
        action={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {extraActions}
            <button onClick={() => setModal({ open: true, item: null })} className="btn-warm-primary">
              <Plus size={18} /> {addLabel}
            </button>
          </div>
        }
      />

      <Panel title={`القائمة (${list.items.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {list.items.map((item) => {
          const row = getRow(item);
          return (
            <ListRow key={item.id} leading={<IconBadge icon={icon} />} title={row.title} subtitle={row.subtitle}>
              {row.side}
              <EditDeleteActions
                onEdit={() => setModal({ open: true, item })}
                onDelete={() => handleDelete(item.id)}
              />
            </ListRow>
          );
        })}
      </div>
      </Panel>

      {modal.open && renderModal({ item: modal.item, onSave: handleSave, onClose: close })}
    </TabCard>
  );
}
