import { useMemo, useState } from 'react';
import { Edit2, Eye, Receipt, RotateCcw, Search, Trash2, Wallet } from 'lucide-react';
import { INVOICE_STATUS } from '../../constants';
import { COLORS, smallOutlineButtonStyle } from '../../styles';
import { invoiceCopay, patientDue } from '../../hooks/useInvoices';
import { formatDateDMY, formatMoney, getToday, formatUser } from '../../utils/format';
import { Panel, ListRow, SectionHeader, TabCard } from '../../components/common/layout';
import StatusBadge from '../../components/common/StatusBadge';
import ShowMore from '../../components/common/ShowMore';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useShowMore } from '../../hooks/useShowMore';
import { INVOICE_SORTS, isInvoiceSort, sortInvoices } from './invoiceSort';

const PAGE_SIZE = 50;
const DATE = /^(\d{4}-\d{2}-\d{2})?$/;
const validateFilter = (key, value) =>
  key === 'sort' ? isInvoiceSort(value) : key === 'status' ? value === '' || Object.values(INVOICE_STATUS).includes(value) : key === 'from' || key === 'to' ? DATE.test(value) : true;

// prefsUser: اسم المستخدم لحفظ آخر فلاتر استخدمها (الحالة، التأمين، الفترة، الفرز). نص البحث لا يُحفظ.
export default function BillingTab({ invoices, onRecordPayment, onEdit, onDelete, onPreview, prefsUser }) {
  const [search, setSearch] = useState('');
  const defaults = useMemo(() => ({ status: '', insurance: '', from: getToday(), to: getToday(), sort: 'default' }), []);
  const [filters, setFilters] = usePersistedState(prefsUser ? `${prefsUser}:billing` : null, defaults, validateFilter);
  const { status, insurance, from, to, sort } = filters;
  const setStatus = (value) => setFilters({ status: value });
  const setInsurance = (value) => setFilters({ insurance: value });
  const setFrom = (value) => setFilters({ from: value });
  const setTo = (value) => setFilters({ to: value });

  const insuranceCompanies = useMemo(
    () => [...new Set(invoices.map((inv) => inv.insurance_company).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')),
    [invoices]
  );

  // البحث والتصفية بالحالة والفترة الزمنية وشركة التأمين
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('ar');
    return invoices.filter(
      (inv) =>
        (!status || inv.status === status) &&
        (!from || inv.date >= from) &&
        (!to || inv.date <= to) &&
        (!insurance ||
          (insurance === 'insured' && Boolean(inv.insurance_company)) ||
          (insurance === 'uninsured' && !inv.insurance_company) ||
          insurance === `company:${inv.insurance_company}`) &&
        (!term || [inv.patient_name, inv.inv_no, inv.service, inv.insurance_company, inv.created_by].some((v) => v && String(v).toLocaleLowerCase('ar').includes(term)))
    );
  }, [invoices, search, status, from, to, insurance]);

  const resetFilters = () => {
    setSearch('');
    setFilters(); // الافتراضي: اليوم، كل الحالات، الأحدث أولاً (ويُمسح المحفوظ)
  };

  // فلاتر تختلف عن الافتراضي (قد تكون مستعادة من آخر استخدام): نُنبّه كي لا يظن المستخدم أن القائمة ناقصة
  const customized = Boolean(status || insurance || sort !== 'default' || from !== defaults.from || to !== defaults.to);

  const sorted = useMemo(() => sortInvoices(filtered, sort), [filtered, sort]);
  const pager = useShowMore(sorted.length, PAGE_SIZE, JSON.stringify([search, filters]));

  return (
    <TabCard>
      <SectionHeader
        title="الفواتير والحسابات المالية"
        description="تُصدر الفواتير من زيارات الأقسام؛ هنا تُسجَّل الدفعات وتُعدَّل البنود وتُعاين وتُحذف"
        icon={Receipt}
      />

      <Panel title="تصفية الفواتير">
      <div className="billing-filters">
        <div className="billing-search">
          <Search size={18} color={COLORS.faint} style={{ position: 'absolute', right: '14px', top: '14px' }} />
          <input
            type="text"
            className="warm-input"
            style={{ margin: 0, paddingRight: '44px' }}
            placeholder="ابحث باسم المريض أو رقم الفاتورة أو الخدمة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="warm-select" aria-label="تصفية حسب حالة الفاتورة">
          <option value="">كل الحالات</option>
          {Object.values(INVOICE_STATUS).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={insurance} onChange={(e) => setInsurance(e.target.value)} className="warm-select" aria-label="تصفية حسب التأمين">
          <option value="">كل الفواتير</option>
          <option value="insured">مؤمَّن</option>
          <option value="uninsured">غير مؤمَّن</option>
          {insuranceCompanies.map((company) => (
            <option key={company} value={`company:${company}`}>{company}</option>
          ))}
        </select>
        <label className="billing-date-filter">
          <span>من</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="warm-input" aria-label="من تاريخ" />
        </label>
        <label className="billing-date-filter">
          <span>إلى</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="warm-input" aria-label="إلى تاريخ" />
        </label>
        <select value={sort} onChange={(e) => setFilters({ sort: e.target.value })} className="warm-select" aria-label="ترتيب الفواتير">
          {INVOICE_SORTS.map((o) => (
            <option key={o.id} value={o.id}>ترتيب: {o.label}</option>
          ))}
        </select>
        <button type="button" onClick={resetFilters} className="billing-reset-filters" title="مسح الفلاتر">
          <RotateCcw size={14} /> مسح الفلاتر
        </button>
      </div>
      <div className="billing-results-count">
        عدد الفواتير: {filtered.length} من {invoices.length}
        {customized && <> • <span style={{ color: COLORS.warnText }}>فلاتر مطبَّقة (محفوظة من آخر استخدام) — اضغط «مسح الفلاتر» للعودة لفواتير اليوم</span></>}
      </div>
      </Panel>

      <Panel title={`قائمة الفواتير (${filtered.length})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: COLORS.faint, padding: '20px' }}>لا توجد فواتير مطابقة.</p>
        )}
        {sorted.slice(0, pager.visible).map((inv) => {
          const isPaid = inv.status === INVOICE_STATUS.PAID;
          return (
            <ListRow
              key={inv.id}
              className="billing-list-row"
              leading={
                <span style={{ fontWeight: '800', color: COLORS.gold, fontSize: '14px', background: COLORS.soft, padding: '8px 12px', borderRadius: '10px', border: `1px solid ${COLORS.border}` }}>
                  {inv.inv_no}
                </span>
              }
              title={inv.patient_name}
              subtitle={`${inv.service} • 📅 ${formatDateDMY(inv.date)}${inv.insurance_company ? ` • 🛡️ ${inv.insurance_company} (تحمّل ${formatMoney(invoiceCopay(inv))})` : ''}${inv.created_by ? ` • 👤 ${formatUser(inv.created_by, inv.created_by_username)}` : ''}`}
            >
              <div className="billing-list-summary" style={{ textAlign: 'left' }}>
                <strong style={{ fontSize: '15px', color: COLORS.ink, display: 'block' }}>الإجمالي: {formatMoney(inv.total)}</strong>
                {inv.insurance_amount > 0 && (
                  <span style={{ fontSize: '12px', color: COLORS.successText, display: 'block' }}>
                    على التأمين: {formatMoney(inv.insurance_amount)} • على المريض: {formatMoney(patientDue(inv))}
                  </span>
                )}
                <span style={{ fontSize: '12px', color: COLORS.muted }}>المدفوع: {formatMoney(inv.paid)}</span>
              </div>

              <div className="billing-list-status">
                <StatusBadge tone={isPaid ? 'success' : 'warning'}>{inv.status}</StatusBadge>
              </div>

              <div className="billing-list-actions">
                {!isPaid && onRecordPayment && (
                  <button
                    onClick={() => onRecordPayment(inv)}
                    style={{ ...smallOutlineButtonStyle, background: COLORS.success, color: '#fff', border: 'none' }}
                  >
                    <Wallet size={14} /> تسجيل دفعة
                  </button>
                )}

                {onEdit && (
                  <button onClick={() => onEdit(inv)} style={smallOutlineButtonStyle}>
                    <Edit2 size={14} color={COLORS.gold} /> تعديل
                  </button>
                )}

                <button onClick={() => onPreview(inv)} style={smallOutlineButtonStyle}>
                  <Eye size={14} color={COLORS.gold} /> معاينة
                </button>

                {onDelete && (
                  <button type="button" onClick={() => onDelete(inv)} aria-label="حذف الفاتورة" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: COLORS.danger }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </ListRow>
          );
        })}
      </div>
      <ShowMore pager={pager} total={sorted.length} pageSize={PAGE_SIZE} noun="فاتورة" />
      </Panel>
    </TabCard>
  );
}
