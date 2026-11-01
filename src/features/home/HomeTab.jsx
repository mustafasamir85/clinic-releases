import { AlertTriangle, CalendarClock, DollarSign, Hourglass, LayoutDashboard, Package } from 'lucide-react';
import { APPOINTMENT_STATUS as ST, INVOICE_STATUS, LOW_STOCK_THRESHOLD, TABS } from '../../constants';
import { COLORS } from '../../styles';
import { formatDateDMY, formatMoney, formatTime12, getToday } from '../../utils/format';
import { patientDue } from '../../hooks/useInvoices';
import { Panel, SectionHeader, TabCard } from '../../components/common/layout';
import StatusBadge from '../../components/common/StatusBadge';

const MAX_ROWS = 8; // أقصى عدد صفوف في كل قائمة (الباقي يُرى في الشاشة الكاملة)

const round2 = (n) => Math.round(n * 100) / 100;

// المتبقي على المريض في الفاتورة (بعد حصة التأمين وما دُفع). الفواتير الملغاة (إجمالي 0) لا متبقي فيها.
const remainingOf = (inv) => round2(patientDue(inv) - (inv.paid ?? 0));

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 14px',
  background: COLORS.card,
  border: `1px solid ${COLORS.border}`,
  borderRadius: '12px',
};

// بطاقة رقم في أعلى الصفحة؛ تفتح الشاشة المعنية عند الضغط إن وُجدت وجهة
function StatCard({ icon: Icon, label, value, hint, tone, onClick }) {
  const color = tone === 'danger' ? COLORS.danger : COLORS.gold;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        ...rowStyle,
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '6px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'start',
        color: COLORS.ink,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.muted, fontSize: '13px', fontWeight: '700' }}>
        <Icon size={16} color={color} aria-hidden="true" /> {label}
      </span>
      <strong style={{ fontSize: '26px', color }}>{value}</strong>
      {hint && <span style={{ fontSize: '12px', color: COLORS.faint }}>{hint}</span>}
    </button>
  );
}

function Empty({ children }) {
  return <p style={{ margin: 0, color: COLORS.faint, fontSize: '13px' }}>{children}</p>;
}

function ViewAll({ onClick }) {
  if (!onClick) return null;
  return (
    <button type="button" onClick={onClick} style={{ background: 'none', border: 'none', color: COLORS.link, cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
      عرض الكل
    </button>
  );
}

// الصفحة الرئيسية (لوحة اليوم): مواعيد اليوم، المنتظرون، الفواتير غير المسددة، الأصناف المنخفضة.
// كل قسم يظهر فقط لمن يملك صلاحية الشاشة المرتبطة به (المواعيد/الفواتير/المستلزمات).
export default function HomeTab({ userName, appointments, invoices, supplies, can, onGoTab }) {
  const today = getToday();
  const canSchedule = can(TABS.SCHEDULE);
  const canBilling = can(TABS.BILLING);
  const canSupplies = can(TABS.SUPPLIES);

  // مواعيد اليوم (بدون الملغاة) مرتبة بالوقت؛ المنتظرون = من سُجّل وصوله ولم تكتمل زيارته
  const todays = appointments.filter((a) => a.date === today && a.status !== ST.CANCELLED).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  const waiting = todays.filter((a) => a.status === ST.ARRIVED);

  // الفواتير التي بقي عليها مبلغ، الأقدم أولاً
  const unpaid = invoices.filter((inv) => remainingOf(inv) > 0).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const unpaidTotal = round2(unpaid.reduce((sum, inv) => sum + remainingOf(inv), 0));

  // الأصناف التي قاربت على النفاد (أقلها مخزوناً أولاً)
  const lowStock = supplies.filter((s) => s.stock < LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock);

  const go = (id) => () => onGoTab(id);
  const hasAnySection = canSchedule || canBilling || canSupplies;

  return (
    <TabCard>
      <SectionHeader
        title={`مرحباً${userName ? `، ${userName}` : ''}`}
        description={`لوحة اليوم — ${new Date().toLocaleDateString('ar-JO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        icon={LayoutDashboard}
      />

      {!hasAnySection && <Empty>اختر شاشة من الشريط أعلاه، أو اضغط Ctrl+K للبحث عن مريض.</Empty>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {canSchedule && (
          <>
            <StatCard icon={CalendarClock} label="مواعيد اليوم" value={todays.length} hint={`${todays.filter((a) => a.status === ST.DONE).length} مكتمل`} onClick={go(TABS.SCHEDULE)} />
            <StatCard icon={Hourglass} label="بانتظار الدخول" value={waiting.length} hint="سُجّل وصولهم" onClick={go(TABS.SCHEDULE)} />
          </>
        )}
        {canBilling && (
          <StatCard icon={DollarSign} label="فواتير غير مسددة" value={unpaid.length} hint={`المتبقي ${formatMoney(unpaidTotal)}`} tone={unpaid.length ? 'danger' : undefined} onClick={go(TABS.BILLING)} />
        )}
        {canSupplies && (
          <StatCard icon={Package} label="أصناف منخفضة" value={lowStock.length} hint={`أقل من ${LOW_STOCK_THRESHOLD} وحدات`} tone={lowStock.length ? 'danger' : undefined} onClick={go(TABS.SUPPLIES)} />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', alignItems: 'start' }}>
        {canSchedule && (
          <Panel title={`مواعيد اليوم (${todays.length})`} icon={CalendarClock} actions={<ViewAll onClick={go(TABS.SCHEDULE)} />}>
            {todays.length === 0 ? (
              <Empty>لا توجد مواعيد لهذا اليوم.</Empty>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {todays.slice(0, MAX_ROWS).map((a) => (
                  <div key={a.id} style={rowStyle}>
                    <span style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                      <strong style={{ color: COLORS.gold, whiteSpace: 'nowrap' }}>{formatTime12(a.time)}</strong>
                      <span style={{ color: COLORS.ink, fontWeight: '700' }}>{a.patient_name}</span>
                      {a.department && <span style={{ color: COLORS.muted, fontSize: '12px' }}>{a.department}</span>}
                    </span>
                    <StatusBadge small tone={a.status === ST.DONE ? 'neutral' : a.status === ST.ARRIVED ? 'success' : 'warning'}>{a.status}</StatusBadge>
                  </div>
                ))}
                {todays.length > MAX_ROWS && <Empty>و{todays.length - MAX_ROWS} موعد آخر…</Empty>}
              </div>
            )}
          </Panel>
        )}

        {canSchedule && (
          <Panel title={`المنتظرون الآن (${waiting.length})`} icon={Hourglass} actions={<ViewAll onClick={go(TABS.SCHEDULE)} />}>
            {waiting.length === 0 ? (
              <Empty>لا يوجد مرضى بانتظار الدخول.</Empty>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {waiting.slice(0, MAX_ROWS).map((a) => (
                  <div key={a.id} style={rowStyle}>
                    <span style={{ color: COLORS.ink, fontWeight: '700' }}>{a.patient_name}</span>
                    <span style={{ color: COLORS.muted, fontSize: '12px' }}>{[a.department, formatTime12(a.time)].filter(Boolean).join(' • ')}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {canBilling && (
          <Panel title={`فواتير غير مسددة (${unpaid.length})`} icon={DollarSign} actions={<ViewAll onClick={go(TABS.BILLING)} />}>
            {unpaid.length === 0 ? (
              <Empty>لا توجد فواتير غير مسددة.</Empty>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {unpaid.slice(0, MAX_ROWS).map((inv) => (
                  <div key={inv.id} style={rowStyle}>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ color: COLORS.ink, display: 'block' }}>{inv.patient_name}</strong>
                      <span style={{ color: COLORS.muted, fontSize: '12px' }}>{inv.inv_no} • {formatDateDMY(inv.date)}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <StatusBadge small tone={inv.status === INVOICE_STATUS.PARTIAL ? 'warning' : 'danger'}>{inv.status}</StatusBadge>
                      <strong style={{ color: COLORS.danger, whiteSpace: 'nowrap' }}>{formatMoney(remainingOf(inv))}</strong>
                    </span>
                  </div>
                ))}
                {unpaid.length > MAX_ROWS && <Empty>و{unpaid.length - MAX_ROWS} فاتورة أخرى…</Empty>}
              </div>
            )}
          </Panel>
        )}

        {canSupplies && (
          <Panel title={`أصناف قاربت على النفاد (${lowStock.length})`} icon={AlertTriangle} actions={<ViewAll onClick={go(TABS.SUPPLIES)} />}>
            {lowStock.length === 0 ? (
              <Empty>مخزون كل الأصناف كافٍ.</Empty>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {lowStock.slice(0, MAX_ROWS).map((s) => (
                  <div key={s.id} style={rowStyle}>
                    <span style={{ color: COLORS.ink, fontWeight: '700' }}>{s.name}</span>
                    <StatusBadge small tone={s.stock <= 0 ? 'danger' : 'warning'}>
                      {s.stock <= 0 ? 'نفد' : `${s.stock} ${s.unit ?? ''}`.trim()}
                    </StatusBadge>
                  </div>
                ))}
                {lowStock.length > MAX_ROWS && <Empty>و{lowStock.length - MAX_ROWS} صنف آخر…</Empty>}
              </div>
            )}
          </Panel>
        )}
      </div>
    </TabCard>
  );
}
