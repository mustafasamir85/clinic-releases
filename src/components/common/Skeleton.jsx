// هياكل عظمية (skeleton) موحّدة لحالة التحميل بدل القائمة الفارغة أو الشاشة البيضاء.
// تحترم prefers-reduced-motion (الوميض يتوقف من App.css).
function SrOnly({ children }) {
  return <span className="skel-sr">{children}</span>;
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="skel-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skel-row" key={i}>
          <span className="skel skel-badge" />
          <span className="skel-lines">
            <span className="skel skel-line" style={{ width: `${55 + ((i * 17) % 30)}%` }} />
            <span className="skel skel-line skel-line-sm" style={{ width: `${30 + ((i * 11) % 25)}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

// شاشة تبويب كاملة قيد التحميل: بطاقة عنوان + قائمة صفوف
export function TabSkeleton({ rows = 5, label = 'جاري التحميل...' }) {
  return (
    <div className="warm-card skel-tab" role="status" aria-busy="true" aria-live="polite">
      <SrOnly>{label}</SrOnly>
      <div className="skel-head" aria-hidden="true">
        <span className="skel skel-title" />
        <span className="skel skel-button" />
      </div>
      <ListSkeleton rows={rows} />
    </div>
  );
}
