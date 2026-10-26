import { useMemo, useState } from 'react';
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Edit2, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { APPOINTMENT_STATUS as ST } from '../../constants';
import { COLORS, iconButtonStyle, smallOutlineButtonStyle } from '../../styles';
import { formatDateDMY, formatTime12, getToday } from '../../utils/format';
import { Panel, ListRow, SectionHeader, TabCard } from '../../components/common/layout';
import StatusBadge from '../../components/common/StatusBadge';
import AppointmentModal from './AppointmentModal';

const TONE = { [ST.BOOKED]: 'warning', [ST.ARRIVED]: 'success', [ST.DONE]: 'neutral', [ST.CANCELLED]: 'danger' };

const shiftDate = (date, days) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
};

// جدول المواعيد: عرض يوم محدد، حجز موعد، وتغيير حالته. appointments = نتيجة useAppointments.
export default function ScheduleTab({ appointments, patients, onNotify }) {
  const [from, setFrom] = useState(getToday());
  const [to, setTo] = useState(getToday());
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | { item? }

  const day = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('ar');
    return appointments.items
      .filter((a) =>
        (!from || a.date >= from) &&
        (!to || a.date <= to) &&
        (!dept || a.department === dept) &&
        (!status || a.status === status) &&
        (!term || [a.patient_name, a.notes, a.department].some((value) => String(value ?? '').toLocaleLowerCase('ar').includes(term)))
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [appointments.items, from, to, dept, status, search]);

  const departments = [...new Set(appointments.items.map((a) => a.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
  const hasFilters = Boolean(search || dept || status);

  const resetFilters = () => {
    setFrom(getToday());
    setTo(getToday());
    setDept('');
    setStatus('');
    setSearch('');
  };

  const handleSubmit = (data) => {
    const editing = modal?.item;
    const conflict = appointments.findConflict(data, editing?.id);
    if (conflict) {
      const samePatient = (data.patient_id && String(conflict.patient_id) === String(data.patient_id)) ||
        (!data.patient_id && conflict.patient_name === data.patient_name);
      if (samePatient && conflict.department === data.department && conflict.date === data.date) {
        return `يوجد موعد آخر لهذا المريض في عيادة ${data.department} بتاريخ ${formatDateDMY(data.date)} الساعة ${formatTime12(conflict.time)}.`;
      }
      return `يوجد حجز آخر في نفس الوقت (${conflict.patient_name} — ${conflict.department}). اختر وقتاً مختلفاً.`;
    }
    if (editing) {
      appointments.update(editing.id, data);
      onNotify('تم تعديل الموعد بنجاح!');
    } else {
      appointments.book(data);
      onNotify(`تم حجز موعد ${data.patient_name} في عيادة ${data.department} الساعة ${formatTime12(data.time)}`, 4000);
    }
    setFrom(data.date);
    setTo(data.date); // نعرض يوم الحجز ليرى المستخدم الموعد فوراً
    setModal(null);
    return '';
  };

  const handleDelete = (a) => {
    if (!window.confirm(`حذف موعد ${a.patient_name}؟`)) return;
    appointments.remove(a.id);
    onNotify('تم حذف الموعد.');
  };

  return (
    <TabCard>
      <SectionHeader
        title="جدول المواعيد والحجوزات اليومية"
        description="حجز المواعيد حسب العيادة؛ يظهر المريض المحجوز في شاشة العيادة يوم موعده"
        action={
          <button onClick={() => setModal({})} className="btn-warm-primary">
            <CalendarPlus size={18} /> حجز موعد جديد
          </button>
        }
      />

      <Panel title="تصفية المواعيد">
      <div className="schedule-filters">
        <div className="schedule-search">
          <Search size={18} color={COLORS.faint} />
          <input
            type="search"
            className="warm-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المريض أو الملاحظات..."
            aria-label="البحث في المواعيد"
          />
        </div>
        <label className="schedule-date-filter"><span>من</span><input type="date" className="warm-input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="من تاريخ" /></label>
        <label className="schedule-date-filter"><span>إلى</span><input type="date" className="warm-input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="إلى تاريخ" /></label>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className="warm-select" aria-label="تصفية حسب العيادة">
          <option value="">كل العيادات</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="warm-select" aria-label="تصفية حسب حالة الموعد">
          <option value="">كل الحالات</option>
          {Object.values(ST).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <div className="schedule-filter-actions">
          <button type="button" onClick={() => { setFrom(shiftDate(from || getToday(), -1)); setTo(shiftDate(to || from || getToday(), -1)); }} aria-label="الفترة السابقة" style={smallOutlineButtonStyle}><ChevronRight size={16} /> السابق</button>
          <button type="button" onClick={() => { setFrom(shiftDate(from || getToday(), 1)); setTo(shiftDate(to || from || getToday(), 1)); }} aria-label="الفترة التالية" style={smallOutlineButtonStyle}><ChevronLeft size={16} /> التالي</button>
          <button type="button" onClick={resetFilters} style={smallOutlineButtonStyle}><RotateCcw size={14} /> اليوم ومسح الفلاتر</button>
        </div>
      </div>
      <div className="schedule-results-count">عدد المواعيد: {day.length}</div>
      </Panel>

      <Panel title={`قائمة المواعيد (${day.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {day.length === 0 && (
          <p style={{ textAlign: 'center', color: COLORS.faint, padding: '20px' }}>{hasFilters ? 'لا توجد مواعيد مطابقة للفلاتر.' : `لا توجد مواعيد خلال الفترة المحددة${from ? ` (${formatDateDMY(from)}${to && to !== from ? ` – ${formatDateDMY(to)}` : ''})` : ''}.`}</p>
        )}

        {day.map((a) => {
          const open = a.status === ST.BOOKED || a.status === ST.ARRIVED;
          return (
            <ListRow
              key={a.id}
              leading={
                <span style={{ fontWeight: '800', color: COLORS.gold, fontSize: '14px', background: COLORS.soft, padding: '6px 12px', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
                  {formatTime12(a.time)}
                </span>
              }
              title={a.patient_name}
              subtitle={`${a.department}${a.notes ? ` • ${a.notes}` : ''}`}
            >
              <StatusBadge tone={TONE[a.status] ?? 'neutral'}>{a.status}</StatusBadge>

              {a.status === ST.BOOKED && (
                <button type="button" onClick={() => appointments.setStatus(a.id, ST.ARRIVED)} style={smallOutlineButtonStyle}>
                  <Check size={14} color={COLORS.gold} /> تسجيل وصول
                </button>
              )}
              {open && (
                <button type="button" onClick={() => appointments.setStatus(a.id, ST.CANCELLED)} style={smallOutlineButtonStyle}>
                  <X size={14} color={COLORS.danger} /> إلغاء
                </button>
              )}
              {open && (
                <button type="button" onClick={() => setModal({ item: a })} aria-label="تعديل" style={iconButtonStyle(COLORS.link)}>
                  <Edit2 size={16} />
                </button>
              )}
              <button type="button" onClick={() => handleDelete(a)} aria-label="حذف" style={iconButtonStyle(COLORS.danger)}>
                <Trash2 size={16} />
              </button>
            </ListRow>
          );
        })}
      </div>
      </Panel>

      {modal && (
        <AppointmentModal item={modal.item} patients={patients} defaultDate={from || getToday()} onSubmit={handleSubmit} onClose={() => setModal(null)} />
      )}
    </TabCard>
  );
}
