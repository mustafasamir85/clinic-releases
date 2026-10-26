import { createContext, useContext, useState } from 'react';
import { ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { COLORS, iconButtonStyle } from '../../styles';

// زر السهم المشترك لطيّ/فتح الأقسام
export function CollapseChevron({ open, onClick, label }) {
  return (
    <button type="button" className="section-collapse-btn" aria-expanded={open} aria-label={label} title={label} onClick={onClick}>
      <ChevronDown size={18} className={`section-collapse-chevron ${open ? '' : 'closed'}`} />
    </button>
  );
}

// قسم فرعي قابل للطي: يعرض العنوان (header) دائماً ويُخفي المحتوى عند الطي.
// المحتوى يُخفى بـ hidden ولا يُزال، فلا تضيع البيانات غير المحفوظة داخله.
export function CollapsibleSection({ header, children, defaultOpen = true, style }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={style}>
      <div className="section-collapse-head">
        <div style={{ flex: 1, minWidth: 0 }}>{header}</div>
        <CollapseChevron open={open} onClick={() => setOpen((o) => !o)} label={open ? 'طي القسم' : 'فتح القسم'} />
      </div>
      <div className="section-collapse-body" hidden={!open}>{children}</div>
    </div>
  );
}

// لوحة قابلة للطي بعنوان وسهم (مثل جداول التقارير): العنوان يبقى ظاهراً ويُخفى المحتوى عند الطي
export function Panel({ title, icon: Icon, children, style, actions, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`panel-box ${open ? '' : 'closed'}`} style={style}>
      <div className="panel-head">
        <CollapseChevron open={open} onClick={() => setOpen((o) => !o)} label={open ? 'طي القسم' : 'فتح القسم'} />
        <h4 className="panel-title">
          {Icon && <Icon size={16} color={COLORS.gold} />}
          {title}
        </h4>
        {actions && <div className="panel-actions">{actions}</div>}
      </div>
      <div className="section-collapse-body" hidden={!open}>{children}</div>
    </section>
  );
}

const TabCardContext = createContext(null);

// بطاقة القسم بعرض ثابت؛ ضغط السهم في رأسها (SectionHeader) يطوي كل ما تحته ويُبقي الرأس
export function TabCard({ maxWidth = 1500, children }) {
  const [open, setOpen] = useState(true);
  return (
    <TabCardContext.Provider value={{ open, toggle: () => setOpen((o) => !o) }}>
      <div className={`warm-card ${open ? '' : 'tab-collapsed'}`} style={{ maxWidth, margin: '0 auto' }}>
        {children}
      </div>
    </TabCardContext.Provider>
  );
}

export function SectionHeader({ title, description, icon: Icon, action }) {
  const card = useContext(TabCardContext);
  return (
    <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        {card && <CollapseChevron open={card.open} onClick={card.toggle} label={card.open ? 'طي القسم' : 'فتح القسم'} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {Icon && <Icon size={24} color={COLORS.gold} />}
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{title}</h2>
          </div>
          {description && <p style={{ margin: '4px 0 0 0', color: COLORS.muted, fontSize: '13px' }}>{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CurrentPatient({ patient }) {
  return (
    <p style={{ color: COLORS.muted, fontSize: '13px', marginBottom: '20px' }}>
      المريض الحالي:{' '}
      <span style={{ fontWeight: '700', color: COLORS.gold }}>
        {patient ? patient.name : 'لم يتم اختيار مريض'}
      </span>
    </p>
  );
}

// صف قائمة: يمين (أيقونة + عنوان + وصف) ويسار (محتوى جانبي)
export function ListRow({ leading, title, subtitle, children, className = '' }) {
  return (
    <div
      className={`list-row ${className}`.trim()}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '16px',
        background: COLORS.card,
        borderRadius: '12px',
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="list-row-main" style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
        {leading}
        <div className="list-row-text" style={{ minWidth: 0 }}>
          <strong style={{ fontSize: '15px', color: COLORS.ink, display: 'block' }}>{title}</strong>
          {subtitle && <span className="list-row-subtitle" style={{ fontSize: '12px', color: COLORS.muted }}>{subtitle}</span>}
        </div>
      </div>
      <div className="list-row-content" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px 16px' }}>{children}</div>
    </div>
  );
}

export function IconBadge({ icon: Icon }) {
  return (
    <span style={{ background: COLORS.soft, padding: '10px', borderRadius: '10px', color: COLORS.gold, border: `1px solid ${COLORS.border}`, display: 'flex' }}>
      <Icon size={20} />
    </span>
  );
}

export function EditDeleteActions({ onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button type="button" onClick={onEdit} aria-label="تعديل" style={iconButtonStyle(COLORS.link)}>
        <Edit2 size={16} />
      </button>
      <button type="button" onClick={onDelete} aria-label="حذف" style={iconButtonStyle(COLORS.danger)}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}
