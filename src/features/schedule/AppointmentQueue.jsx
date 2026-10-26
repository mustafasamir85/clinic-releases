import { CalendarClock } from 'lucide-react';
import { APPOINTMENT_STATUS as ST } from '../../constants';
import { COLORS } from '../../styles';
import { formatTime12, getToday } from '../../utils/format';
import { Panel } from '../../components/common/layout';
import StatusBadge from '../../components/common/StatusBadge';

// مرضى اليوم المحجوزون في هذه العيادة. الضغط على مريض يختاره ويسجّل وصوله.
export default function AppointmentQueue({ appointments, department, currentPatient, onPick }) {
  const today = getToday();
  const queue = appointments
    .filter((a) => a.department === department && a.date === today && [ST.BOOKED, ST.ARRIVED].includes(a.status))
    .sort((a, b) => a.time.localeCompare(b.time));

  const isCurrent = (a) =>
    currentPatient && (a.patient_id ? a.patient_id === currentPatient.id : a.patient_name === currentPatient.name);

  return (
    <Panel title={`المرضى المحجوزون اليوم في هذه العيادة (${queue.length})`} icon={CalendarClock} style={{ marginBottom: '20px' }}>

      {queue.length === 0 ? (
        <p style={{ margin: 0, color: COLORS.faint, fontSize: '13px' }}>لا توجد حجوزات فعّالة لهذا اليوم.</p>
      ) : (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {queue.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(a)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 14px',
                borderRadius: '12px',
                cursor: 'pointer',
                background: isCurrent(a) ? COLORS.soft : COLORS.white,
                border: isCurrent(a) ? `2px solid ${COLORS.gold}` : `1px solid ${COLORS.border}`,
                color: COLORS.ink,
                fontWeight: '700',
                fontSize: '13px',
              }}
            >
              <span style={{ color: COLORS.gold }}>{formatTime12(a.time)}</span>
              <span>{a.patient_name}</span>
              <StatusBadge small tone={a.status === ST.ARRIVED ? 'success' : 'warning'}>{a.status}</StatusBadge>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
