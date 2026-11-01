import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Panel, ListRow, IconBadge, EditDeleteActions, SectionHeader, TabCard } from './layout';
import { useConfirm } from './ConfirmDialog';
import ShowMore from './ShowMore';
import { useShowMore } from '../../hooks/useShowMore';
import { normalizeArabic } from '../../utils/suggestions';

const PAGE_SIZE = 50;
const SEARCH_MIN_ITEMS = 8; // لا نزدحم بشريط البحث في قائمة قصيرة

// نص البحث للعنصر: كل حقوله النصية والرقمية (الاسم، القسم، الهاتف، الملاحظات...) عدا المعرّف
const searchText = (item) =>
  normalizeArabic(
    Object.entries(item)
      .filter(([key, value]) => key !== 'id' && (typeof value === 'string' || typeof value === 'number'))
      .map(([, value]) => value)
      .join(' ')
  );

// قالب موحّد لأقسام الإدارة (الخدمات، المستلزمات، التأمينات):
// عنوان + زر إضافة + بحث وترتيب + قائمة صفوف مع تعديل/حذف ونافذة إدخال.
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
  const confirm = useConfirm();
  const [modal, setModal] = useState({ open: false, item: null });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('added'); // added = ترتيب الإضافة | name = الاسم (أ-ي)
  const close = () => setModal({ open: false, item: null });

  const total = list.items.length;
  const showTools = total >= SEARCH_MIN_ITEMS || query !== '';

  const visibleItems = useMemo(() => {
    const q = normalizeArabic(query);
    const matched = q ? list.items.filter((item) => searchText(item).includes(q)) : list.items;
    if (sort !== 'name') return matched;
    const nameOf = (item) => String(item.name ?? getRow(item).title ?? '');
    return [...matched].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'ar', { numeric: true }));
    // getRow يُعاد إنشاؤه كل رسم من الأب؛ الاعتماد على العناصر والبحث والترتيب كافٍ
  }, [list.items, query, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const pager = useShowMore(visibleItems.length, PAGE_SIZE, JSON.stringify([query, sort]));

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

  const handleDelete = async (id) => {
    // قوائم البيانات المرجعية القابلة للاستعادة: نحذف فوراً ونمنح 8 ثوانٍ للتراجع بدل نافذة تأكيد تقطع العمل.
    // (القوائم التي يترتب على حذفها سجلات مخزون تُمرَّر بدون restore فتبقى بالتأكيد.)
    if (list.restore) {
      const index = list.items.findIndex((i) => String(i.id) === String(id));
      const item = list.items[index];
      if (!item) return;
      list.remove(id);
      onNotify(messages.deleted, { type: 'success', duration: 8000, action: { label: 'تراجع', onClick: () => list.restore(item, index) } });
      return;
    }
    if (!(await confirm({ title: 'تأكيد الحذف', message: 'هل أنت متأكد من الحذف؟', confirmLabel: 'حذف', danger: true }))) return;
    list.remove(id);
    onNotify(messages.deleted);
  };

  const countLabel = query ? `${visibleItems.length} من ${total}` : total;

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

      <Panel title={`القائمة (${countLabel})`}>
        {showTools && (
          <div className="list-toolbar">
            <div className="list-search">
              <Search size={16} className="list-search-icon" aria-hidden="true" />
              <input
                type="search"
                className="warm-input list-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && query) {
                    e.stopPropagation();
                    setQuery('');
                  }
                }}
                placeholder="ابحث بالاسم أو أي تفصيل..."
                aria-label="بحث في القائمة"
              />
              {query && (
                <button type="button" className="list-search-clear" onClick={() => setQuery('')} aria-label="مسح البحث">
                  <X size={14} />
                </button>
              )}
            </div>
            <select className="warm-select list-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="ترتيب القائمة">
              <option value="added">الترتيب: حسب الإضافة</option>
              <option value="name">الترتيب: الاسم (أ-ي)</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visibleItems.slice(0, pager.visible).map((item) => {
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

        {total === 0 && <p className="list-empty">لا توجد عناصر بعد. اضغط «{addLabel}» للبدء.</p>}
        {total > 0 && visibleItems.length === 0 && (
          <p className="list-empty" role="status">
            لا توجد نتائج تطابق «{query}». <button type="button" className="list-empty-link" onClick={() => setQuery('')}>مسح البحث</button>
          </p>
        )}

        <ShowMore pager={pager} total={visibleItems.length} pageSize={PAGE_SIZE} noun="عنصر" />
      </Panel>

      {modal.open && renderModal({ item: modal.item, onSave: handleSave, onClose: close })}
    </TabCard>
  );
}
