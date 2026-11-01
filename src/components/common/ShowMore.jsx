import { COLORS, smallOutlineButtonStyle } from '../../styles';

// تذييل القوائم المقتطعة: يوضّح كم عُرض من كم، ويتيح «عرض المزيد» أو «عرض الكل»،
// كي لا يظن المستخدم أن السجل ناقص. pager = ناتج useShowMore.
export default function ShowMore({ pager, total, pageSize = 50, noun = 'سجل' }) {
  if (total === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }} aria-live="polite">
      <span style={{ fontSize: '13px', color: COLORS.muted }}>
        عُرض {pager.visible} من {total} {noun}
      </span>
      {pager.hasMore && (
        <>
          <button type="button" onClick={pager.more} style={smallOutlineButtonStyle}>
            عرض المزيد ({Math.min(pageSize, total - pager.visible)})
          </button>
          <button type="button" onClick={pager.all} style={smallOutlineButtonStyle}>
            عرض الكل
          </button>
        </>
      )}
    </div>
  );
}
