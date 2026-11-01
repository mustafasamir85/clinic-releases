import { History, Save } from 'lucide-react';
import { COLORS } from '../../styles';

const ago = (ts) => {
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (minutes < 1) return 'قبل لحظات';
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  return `قبل ${Math.round(hours / 24)} يوم`;
};

const btn = { borderRadius: '10px', padding: '6px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' };

// شريط المسودة: إما سؤال «استرجاع / تجاهل» لمسودة محفوظة، أو سطر صغير يؤكد أن الحفظ التلقائي يعمل.
// draft = ناتج useDraft
export default function DraftBanner({ draft }) {
  const { pending, savedAt, restore, discard } = draft;

  if (pending) {
    return (
      <div
        role="alert"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
          padding: '10px 14px', marginBottom: '16px', borderRadius: '12px',
          background: COLORS.warnBg, color: COLORS.warnText, border: `1px solid ${COLORS.border}`, fontSize: '13px', fontWeight: '700',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={16} aria-hidden="true" />
          توجد مسودة غير محفوظة{pending.patientName ? ` للمريض ${pending.patientName}` : ''} ({ago(pending.savedAt)}).
        </span>
        <span style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={restore} style={{ ...btn, background: COLORS.gold, color: 'var(--c-on-btn)', border: 'none' }}>استرجاع</button>
          <button type="button" onClick={discard} style={{ ...btn, background: 'transparent', color: COLORS.warnText, border: `1px solid ${COLORS.warnText}` }}>تجاهل</button>
        </span>
      </div>
    );
  }

  if (savedAt) {
    return (
      <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0', fontSize: '12px', color: COLORS.faint }} aria-live="polite">
        <Save size={12} aria-hidden="true" />
        حُفظت مسودة تلقائياً {new Date(savedAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
      </p>
    );
  }
  return null;
}
