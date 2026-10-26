import { useMemo, useRef, useState } from 'react';
import { PrintHeader } from '../../components/common/PrintBrand';
import { BarChart3, Download, Eye, FileText, Printer, Wallet } from 'lucide-react';
import { COLORS, outlineGoldButtonStyle } from '../../styles';
import { formatDateDMY, formatMoney, formatUser, getToday } from '../../utils/format';
import ItemStatementModal from '../supplies/ItemStatementModal';
import { downloadCsv } from '../../utils/csv';
import { printReport } from '../../utils/printReport';
import { CollapseChevron, SectionHeader, TabCard } from '../../components/common/layout';
import { accountingReport, adminReport, cashStatement, freeServicesReport, insuranceClaim, patientsRegistry } from './reportData';
import { ChartGrid, CompareBars, HorizontalBars, ShareDonut, TrendLines } from './ReportCharts';
import { ACTIONS } from '../../auth/permissions';
import CashStatementModal from './CashStatementModal';
import InsuranceClaimModal from './InsuranceClaimModal';
import Modal from '../../components/common/Modal';

// ===== الفترة الزمنية =====
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA');
};

const PRESETS = {
  today: { label: 'اليوم', range: () => [getToday(), getToday()] },
  month: { label: 'هذا الشهر', range: () => [`${getToday().slice(0, 7)}-01`, getToday()] },
  last30: { label: 'آخر 30 يوماً', range: () => [daysAgo(30), getToday()] },
  year: { label: 'هذه السنة', range: () => [`${getToday().slice(0, 4)}-01-01`, getToday()] },
  all: { label: 'كل الفترات', range: () => ['', ''] },
  custom: { label: 'فترة مخصّصة', range: null },
};

// ===== مكوّنات العرض =====
const Kpi = ({ label, value, tone }) => (
  <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '16px' }}>
    <span style={{ fontSize: '12px', color: COLORS.muted }}>{label}</span>
    <strong style={{ display: 'block', marginTop: '6px', fontSize: '20px', color: tone ?? COLORS.ink }}>{value}</strong>
  </div>
);

const KpiGrid = ({ children }) => (
  <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '24px' }}>{children}</div>
);

const cellStyle = { padding: '10px 12px', textAlign: 'right', borderBottom: `1px solid ${COLORS.border}`, fontSize: '13px' };

// جدول تقرير مع زر تصدير CSV. columns: [{ label, get(row) }]
function ReportTable({ title, columns, rows, filename, printNote = '' }) {
  const rootRef = useRef(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const exportable = columns.filter((c) => !c.noExport); // أعمدة الأزرار لا تُصدَّر
  const exportCsv = () =>
    downloadCsv(
      `${filename}.csv`,
      exportable.map((c) => c.label),
      rows.map((r) => exportable.map((c) => c.text?.(r) ?? c.get(r)))
    );
  const reportTitle = printNote ? `${title} — ${printNote}` : title;
  const renderTable = () => rows.length === 0 ? (
    <p style={{ color: COLORS.faint, fontSize: '13px', margin: 0 }}>لا توجد بيانات في هذه الفترة.</p>
  ) : (
    <div className="report-table-scroll" style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '12px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: COLORS.card }}>
        <thead>
          <tr style={{ background: COLORS.soft }}>
            {columns.map((c) => (
              <th key={c.label} style={{ ...cellStyle, color: COLORS.text, fontWeight: '800' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.label} style={{ ...cellStyle, color: COLORS.ink }}>{c.get(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
    <section ref={rootRef} className="report-table-card">
      <div className="report-table-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CollapseChevron open={!tableCollapsed} onClick={() => setTableCollapsed((c) => !c)} label={tableCollapsed ? 'فتح الجدول' : 'طي الجدول'} />
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>{title}</h4>
        </div>
        <div className="report-table-actions">
          <button type="button" onClick={() => setPreviewOpen(true)} style={outlineGoldButtonStyle}>
            <Eye size={14} color={COLORS.gold} /> معاينة
          </button>
          <button type="button" onClick={() => printReport({ section: rootRef.current, title: reportTitle })} disabled={rows.length === 0} style={outlineGoldButtonStyle}>
            <Printer size={14} color={COLORS.gold} /> طباعة
          </button>
          <button type="button" onClick={exportCsv} disabled={rows.length === 0} style={outlineGoldButtonStyle}>
            <Download size={14} color={COLORS.gold} /> تصدير CSV
          </button>
        </div>
      </div>
      <div className="section-collapse-body" hidden={tableCollapsed}>{renderTable()}</div>
    </section>
    {previewOpen && (
      <Modal title="" subtitle={reportTitle} maxWidth={1100} onClose={() => setPreviewOpen(false)}>
        <div className="paper-sheet report-preview-paper">
          <PrintHeader>
            <div>{reportTitle}</div>
            <div>تاريخ الطباعة: {formatDateDMY(getToday())}</div>
          </PrintHeader>
          <div className="report-preview-table">{renderTable()}</div>
        </div>
        <div className="report-preview-actions">
          <button type="button" onClick={() => printReport({ orientation: 'landscape' })} disabled={rows.length === 0} className="btn-warm-primary">
            <Printer size={15} /> طباعة التقرير
          </button>
        </div>
      </Modal>
    )}
    </>
  );
}

// ===== التقارير المحاسبية =====
// اختيار شركة ثم معاينة مطالبتها: يظهر دائماً (حتى لو لا فواتير تأمين في الفترة المختارة) كي لا يختفي الزر
function ClaimPicker({ companies, onClaim }) {
  const [company, setCompany] = useState('');
  const selected = companies.includes(company) ? company : companies[0] ?? '';

  return (
    <div className="claim-picker" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '12px 14px', marginBottom: '16px' }}>
      <strong style={{ fontSize: '14px' }}>مطالبة شركة تأمين</strong>
      <select value={selected} onChange={(e) => setCompany(e.target.value)} className="warm-select" style={{ margin: 0, width: 'auto', flex: '1 1 200px' }} aria-label="شركة التأمين" disabled={companies.length === 0}>
        {companies.length === 0 ? <option value="">لا توجد شركات تأمين</option> : companies.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="button" onClick={() => onClaim(selected)} disabled={!selected} style={outlineGoldButtonStyle}>
        <Printer size={14} color={COLORS.gold} /> معاينة وطباعة المطالبة
      </button>
    </div>
  );
}

function AccountingView({ data, free, onClaim, companies }) {
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const { kpis: k } = data;
  return (
    <>
      <KpiGrid>
        <Kpi label="عدد الفواتير" value={k.count} />
        <Kpi label="إجمالي الفواتير" value={formatMoney(k.billed)} />
        <Kpi label="حصة شركات التأمين (مستحقة لنا)" value={formatMoney(k.insuranceShare)} tone={COLORS.link} />
        <Kpi label="حصة المرضى" value={formatMoney(k.patientShare)} />
        <Kpi label="المحصّل من المرضى" value={formatMoney(k.collected)} tone={COLORS.successText} />
        <Kpi label="ذمم المرضى غير المدفوعة" value={formatMoney(k.outstanding)} tone={k.outstanding > 0 ? COLORS.danger : COLORS.successText} />
        <Kpi label={`الخدمات المجانية (${free.count})`} value={formatMoney(free.value)} tone={COLORS.successText} />
        <Kpi label="مشتريات المخزون (مصروفات)" value={formatMoney(k.expenses)} />
        <Kpi label="صافي النقد (المحصّل − المشتريات)" value={formatMoney(k.net)} tone={k.net >= 0 ? COLORS.successText : COLORS.danger} />
      </KpiGrid>

      <ChartGrid>
        <CompareBars
          title="ملخص مالي للفترة"
          items={[
            { label: 'إجمالي الفواتير', value: k.billed, color: 'var(--c-accent)' },
            { label: 'المحصّل', value: k.collected, color: 'var(--c-success-text)' },
            { label: 'الذمم', value: k.outstanding, color: 'var(--c-danger)' },
            { label: 'المشتريات', value: k.expenses, color: 'var(--c-warn-text)' },
            { label: 'صافي النقد', value: k.net, color: k.net >= 0 ? 'var(--c-link)' : 'var(--c-danger)' },
          ]}
        />
        <ShareDonut
          title="توزيع قيمة الفواتير"
          slices={[
            { label: 'حصة المرضى', value: k.patientShare, color: 'var(--c-accent)' },
            { label: 'حصة التأمين', value: k.insuranceShare, color: 'var(--c-link)' },
          ]}
        />
        <TrendLines
          title="الفواتير والتحصيل والمشتريات عبر الفترة"
          points={data.byPeriod}
          series={[
            { key: 'billed', label: 'إجمالي الفواتير (د.أ)', color: 'var(--c-accent)' },
            { key: 'collected', label: 'المحصّل (د.أ)', color: 'var(--c-success-text)' },
            { key: 'expenses', label: 'المشتريات (د.أ)', color: 'var(--c-warn-text)' },
          ]}
        />
        <HorizontalBars
          title="المطلوب من شركات التأمين"
          rows={data.byInsurance}
          valueKey="share"
          formatValue={(r) => formatMoney(r.share)}
        />
      </ChartGrid>

      <ReportTable
        title="الذمم المستحقة على المرضى"
        filename="receivables"
        rows={data.unpaid}
        columns={[
          { label: 'رقم الفاتورة', get: (r) => r.inv_no },
          { label: 'المريض', get: (r) => r.patient_name },
          { label: 'التاريخ', get: (r) => formatDateDMY(r.date) },
          { label: 'حصة المريض', get: (r) => formatMoney(patientDueOf(r)), text: patientDueOf },
          { label: 'المدفوع', get: (r) => formatMoney(r.paid), text: (r) => r.paid },
          { label: 'المتبقي', get: (r) => formatMoney(r.remaining), text: (r) => r.remaining },
          { label: 'الحالة', get: (r) => r.status },
          { label: 'المستخدم', get: (r) => formatUser(r.created_by, r.created_by_username) || '—', text: (r) => formatUser(r.created_by, r.created_by_username) },
        ]}
      />

      <ReportTable
        title="الخدمات المجانية (قيمتها الأصلية المتنازل عنها)"
        filename="free-services"
        rows={free.rows}
        columns={FREE_COLUMNS}
      />

      {onClaim && <div className="no-print"><ClaimPicker companies={companies} onClaim={onClaim} /></div>}

      <ReportTable
        title="المطالبات حسب شركة التأمين"
        filename="insurance-claims"
        rows={data.byInsurance}
        columns={[
          { label: 'شركة التأمين', get: (r) => r.key },
          { label: 'عدد الفواتير', get: (r) => r.count },
          { label: 'إجمالي الفواتير', get: (r) => formatMoney(r.total), text: (r) => r.total },
          { label: 'المطلوب من الشركة', get: (r) => formatMoney(r.share), text: (r) => r.share },
          {
            label: 'المطالبة',
            noExport: true,
            get: (r) => (
              <button type="button" onClick={() => onClaim(r.key)} style={{ ...outlineGoldButtonStyle, padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                <Printer size={13} color={COLORS.gold} /> معاينة وطباعة
              </button>
            ),
          },
        ]}
      />

      <ReportTable
        title="مشتريات المخزون"
        filename="purchases"
        rows={data.purchases}
        columns={[
          { label: 'رقم الفاتورة', get: (r) => r.no },
          { label: 'التاريخ', get: (r) => formatDateDMY(r.date) },
          { label: 'المورد', get: (r) => r.supplier },
          { label: 'المستخدم', get: (r) => formatUser(r.created_by, r.created_by_username) || '—', text: (r) => formatUser(r.created_by, r.created_by_username) },
          { label: 'عدد الأصناف', get: (r) => r.items.length },
          { label: 'الإجمالي', get: (r) => formatMoney(r.total), text: (r) => r.total },
          {
            label: 'التفاصيل',
            noExport: true,
            get: (r) => (
              <button type="button" onClick={() => setSelectedPurchase(r)} style={{ ...outlineGoldButtonStyle, padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                <Eye size={13} color={COLORS.gold} /> عرض التفاصيل
              </button>
            ),
          },
        ]}
      />
      {selectedPurchase && <PurchaseDetailsModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />}
    </>
  );
}

const FREE_COLUMNS = [
  { label: 'التاريخ', get: (r) => formatDateDMY(r.date), text: (r) => r.date },
  { label: 'رقم الفاتورة', get: (r) => <span style={{ whiteSpace: 'nowrap' }}>{r.invNo}</span>, text: (r) => r.invNo },
  { label: 'المريض', get: (r) => r.patient },
  { label: 'القسم', get: (r) => r.department },
  { label: 'الخدمة المجانية', get: (r) => r.service },
  { label: 'المستخدم', get: (r) => r.user || '—', text: (r) => r.user },
  { label: 'قيمتها الأصلية', get: (r) => formatMoney(r.value), text: (r) => r.value },
];

const patientDueOf = (inv) => Math.round((inv.total - (inv.insurance_amount ?? 0)) * 100) / 100;

function PurchaseDetailsModal({ purchase, onClose }) {
  return (
    <Modal title={`تفاصيل المشتريات ${purchase.no}`} subtitle={`${purchase.supplier} • ${formatDateDMY(purchase.date)}`} maxWidth={760} onClose={onClose}>
      <div className="paper-sheet purchase-details-paper">
        <PrintHeader>
          <div>تفاصيل المشتريات {purchase.no}</div>
        </PrintHeader>
        <div className="purchase-details-meta">
          <span><strong>رقم الفاتورة:</strong> {purchase.no}</span>
          <span><strong>المورد:</strong> {purchase.supplier}</span>
          <span><strong>التاريخ:</strong> {formatDateDMY(purchase.date)}</span>
          {purchase.created_by && <span><strong>المستخدم:</strong> {formatUser(purchase.created_by, purchase.created_by_username)}</span>}
        </div>
        <div className="report-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: COLORS.soft }}>
                {['الصنف', 'النوع', 'الكمية', 'تكلفة الوحدة', 'الإجمالي'].map((label) => (
                  <th key={label} style={{ ...cellStyle, color: COLORS.text, fontWeight: '800' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchase.items.map((item, index) => {
                const unitCost = Number(item.unit_cost ?? 0);
                return (
                  <tr key={item.supply_id ?? item.hearing_aid_id ?? index}>
                    <td style={{ ...cellStyle, color: COLORS.ink }}>{item.name}</td>
                    <td style={{ ...cellStyle, color: COLORS.ink }}>{item.item_type === 'hearing_aid' ? 'سماعة طبية' : 'مستلزم'}</td>
                    <td style={{ ...cellStyle, color: COLORS.ink }}>{item.qty} {item.unit ?? 'قطعة'}</td>
                    <td style={{ ...cellStyle, color: COLORS.ink }}>{formatMoney(unitCost)}</td>
                    <td style={{ ...cellStyle, color: COLORS.ink }}>{formatMoney(Number(item.qty) * unitCost)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ ...cellStyle, fontWeight: '800', color: COLORS.ink }}>إجمالي المشتريات</td>
                <td style={{ ...cellStyle, fontWeight: '800', color: COLORS.gold }}>{formatMoney(purchase.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {purchase.notes && <p style={{ margin: '12px 0 0', color: COLORS.muted }}><strong>ملاحظات:</strong> {purchase.notes}</p>}
      </div>
      <div className="report-preview-actions">
        <button type="button" onClick={() => printReport({ orientation: 'portrait' })} className="btn-warm-primary">
          <Printer size={15} /> طباعة تفاصيل المشتريات
        </button>
      </div>
    </Modal>
  );
}

// ===== التقارير الإدارية =====
function AdminView({ data, free, registry }) {
  const { kpis: k } = data;
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [coverage, setCoverage] = useState('all'); // all | insured | uninsured
  const departments = [...new Set(data.visitLog.map((row) => row.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
  const term = search.trim().toLocaleLowerCase('ar');
  const visitRows = data.visitLog.filter((row) =>
    (!term || [row.patient, row.fileNo, row.invoiceNo, row.procedures, row.summary].some((value) => String(value ?? '').toLocaleLowerCase('ar').includes(term))) &&
    (!department || row.department === department) &&
    (coverage === 'all' || (coverage === 'insured' ? Boolean(row.insurer) : !row.insurer))
  );
  const visitFilterNotes = [
    search.trim() && `بحث: ${search.trim()}`,
    department,
    coverage === 'insured' ? 'مرضى التأمين فقط' : coverage === 'uninsured' ? 'المرضى بدون تأمين' : '',
  ].filter(Boolean).join(' • ');
  return (
    <>
      <KpiGrid>
        <Kpi label="عدد الزيارات" value={k.visits} />
        <Kpi label="مرضى تمت زيارتهم" value={`${k.patients} من ${k.totalPatients}`} />
        <Kpi label="زيارات مرضى التأمين" value={`${k.insuredVisits} (${k.insuredPatients} مريض)`} tone={COLORS.link} />
 <Kpi label="عدد المرضى الحاليين" value={registry.count} />
        <Kpi label="مسجَّلون في الفترة" value={registry.newInPeriod} tone={COLORS.link} />
 <Kpi label="خدمات مجانية مقدَّمة" value={`${free.count} (${formatMoney(free.value)})`} tone={COLORS.successText} />
        <Kpi label="أصناف مخزون منخفضة" value={k.lowStock} tone={k.lowStock > 0 ? COLORS.danger : COLORS.successText} />
        <Kpi label="قيمة المخزون الحالية (بسعر التكلفة)" value={formatMoney(k.stockValue)} />
      </KpiGrid>

      <ChartGrid>
        <HorizontalBars
          title="الزيارات حسب القسم"
          rows={data.byDepartment}
          valueKey="count"
          formatValue={(r) => `${r.count} زيارة`}
        />
        <ShareDonut
          title="توزيع الزيارات (تأمين / بدون)"
          slices={[
            { label: 'زيارات التأمين', value: k.insuredVisits, color: 'var(--c-link)' },
            { label: 'بدون تأمين', value: Math.max(0, k.visits - k.insuredVisits), color: 'var(--c-accent)' },
          ]}
        />
        <TrendLines
          title="حركة الزيارات عبر الفترة"
          points={data.visitsByPeriod}
          series={[{ key: 'count', label: 'عدد الزيارات', color: 'var(--c-accent)' }]}
        />
        <HorizontalBars
          title="الإجراءات الأكثر تنفيذاً"
          rows={data.topProcedures}
          valueKey="count"
          formatValue={(r) => `${r.count} مرة`}
        />
        <HorizontalBars
          title="الخدمات المجانية حسب القسم"
          rows={free.byDepartment}
          valueKey="value"
          formatValue={(r) => formatMoney(r.value)}
        />
        <HorizontalBars
          title="المستلزمات الأكثر استهلاكاً"
          rows={data.topSupplies}
          valueKey="qty"
          formatValue={(r) => `${r.qty} ${r.unit ?? ''}`.trim()}
        />
      </ChartGrid>

      <div className="no-print visit-report-filters">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="warm-input"
          placeholder="ابحث باسم المريض أو رقم الملف أو الفاتورة..."
          aria-label="البحث في سجل الزيارات"
        />
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="warm-select" aria-label="تصفية حسب القسم">
          <option value="">كل الأقسام</option>
          {departments.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={coverage} onChange={(e) => setCoverage(e.target.value)} className="warm-select" aria-label="تصفية حسب التأمين">
          <option value="all">كل المرضى (مؤمَّنون وغير مؤمَّنين)</option>
          <option value="insured">مرضى التأمين فقط</option>
          <option value="uninsured">بدون تأمين فقط</option>
        </select>
        <span className="visit-report-count">عدد النتائج: {visitRows.length}</span>
      </div>

      <ReportTable
        title="سجل زيارات المرضى التفصيلي"
        filename="patient-visits"
        printNote={visitFilterNotes}
        rows={visitRows}
        columns={[
          { label: 'التاريخ', get: (r) => formatDateDMY(r.date), text: (r) => r.date },
          { label: 'رقم الملف', get: (r) => r.fileNo || '—', text: (r) => r.fileNo },
          { label: 'المريض', get: (r) => r.patient },
          { label: 'القسم', get: (r) => r.department },
          { label: 'شركة التأمين', get: (r) => r.insurer || 'بدون تأمين', text: (r) => r.insurer },
          { label: 'الإجراءات', get: (r) => r.procedures || '—', text: (r) => r.procedures },
          { label: 'المستلزمات', get: (r) => r.supplies || '—', text: (r) => r.supplies },
          { label: 'الملخص الطبي', get: (r) => <span style={{ display: 'block', minWidth: 0, maxWidth: '280px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{r.summary || '—'}</span>, text: (r) => r.summary },
          { label: 'رقم الفاتورة', get: (r) => <span style={{ whiteSpace: 'nowrap' }}>{r.invoiceNo || '—'}</span>, text: (r) => r.invoiceNo },
          { label: 'المستخدم', get: (r) => r.user || '—', text: (r) => r.user },
        ]}
      />

      <ReportTable
        title="الزيارات حسب القسم"
        filename="visits-by-department"
        rows={data.byDepartment}
        columns={[
          { label: 'القسم', get: (r) => r.key },
          { label: 'عدد الزيارات', get: (r) => r.count },
          { label: 'عدد المرضى', get: (r) => r.patients },
        ]}
      />

      <ReportTable
        title="الإجراءات الأكثر تنفيذاً"
        filename="top-procedures"
        rows={data.topProcedures}
        columns={[
          { label: 'الإجراء', get: (r) => r.key },
          { label: 'عدد المرات', get: (r) => r.count },
          { label: 'منها مجانية', get: (r) => r.free, text: (r) => r.free },
          { label: 'الإيراد', get: (r) => formatMoney(r.revenue), text: (r) => r.revenue },
        ]}
      />

      <ReportTable
        title={`قائمة المرضى الحاليين (${registry.count} مريض)`}
        filename="patients-list"
        rows={registry.rows}
        columns={[
          { label: 'رقم الملف', get: (r) => r.fileNo ?? '—', text: (r) => r.fileNo ?? '' },
          { label: 'الاسم', get: (r) => r.name },
          { label: 'الهاتف', get: (r) => <span dir="ltr">{r.phone || '—'}</span>, text: (r) => r.phone },
          {
            label: 'تاريخ التسجيل',
            get: (r) => (r.registered ? <>{formatDateDMY(r.registered)}{r.approx && <small style={{ color: COLORS.faint }}> (أول زيارة)</small>}</> : '—'),
            text: (r) => r.registered,
          },
          { label: 'عدد الزيارات', get: (r) => r.visits },
        ]}
      />

      <ReportTable
        title="الخدمات المجانية حسب القسم"
        filename="free-services-by-department"
        rows={free.byDepartment}
        columns={[
          { label: 'القسم', get: (r) => r.key },
          { label: 'عدد الخدمات المجانية', get: (r) => r.count },
          { label: 'قيمتها الأصلية', get: (r) => formatMoney(r.value), text: (r) => r.value },
        ]}
      />

      <ReportTable
        title="الخدمات المجانية حسب الخدمة"
        filename="free-services-by-service"
        rows={free.byService}
        columns={[
          { label: 'الخدمة', get: (r) => r.key },
          { label: 'عدد المرات', get: (r) => r.count },
          { label: 'قيمتها الأصلية', get: (r) => formatMoney(r.value), text: (r) => r.value },
        ]}
      />

      <ReportTable
        title="سجل الخدمات المجانية التفصيلي"
        filename="free-services-log"
        rows={free.rows}
        columns={FREE_COLUMNS}
      />

      <ReportTable
        title="المستلزمات الأكثر استهلاكاً"
        filename="top-supplies"
        rows={data.topSupplies}
        columns={[
          { label: 'المستلزم', get: (r) => r.key },
          { label: 'الكمية', get: (r) => `${r.qty} ${r.unit ?? ''}`.trim(), text: (r) => r.qty },
          { label: 'القيمة المفوترة', get: (r) => formatMoney(r.revenue), text: (r) => r.revenue },
        ]}
      />

      <ReportTable
        title="أصناف المخزون المنخفضة"
        filename="low-stock"
        rows={data.lowStock}
        columns={[
          { label: 'الصنف', get: (r) => r.name },
          { label: 'المتوفر', get: (r) => `${r.stock} ${r.unit ?? ''}`.trim(), text: (r) => r.stock },
        ]}
      />

      <ReportTable
        title="المشتريات حسب المورد"
        filename="purchases-by-supplier"
        rows={data.bySupplier}
        columns={[
          { label: 'المورد', get: (r) => r.key },
          { label: 'عدد الفواتير', get: (r) => r.count },
          { label: 'الإجمالي', get: (r) => formatMoney(r.total), text: (r) => r.total },
        ]}
      />
    </>
  );
}

// ===== الشاشة الرئيسية =====
export default function ReportsTab({ invoices, patients, purchases, supplies, movements = [], hearingAids = [], insuranceCompanies = [], can = () => true }) {
  // ما يظهر داخل التقارير يتبع صلاحيات الأقسام (والمدير يملكها كلها)
  const canAccounting = can(ACTIONS.REPORTS_ACCOUNTING);
  const canAdmin = can(ACTIONS.REPORTS_ADMIN);
  const canCash = can(ACTIONS.REPORTS_CASH);
  const canClaims = can(ACTIONS.REPORTS_CLAIMS);
  const [requestedView, setView] = useState('accounting');
  const view = requestedView === 'accounting' ? (canAccounting ? 'accounting' : canAdmin ? 'admin' : null) : canAdmin ? 'admin' : canAccounting ? 'accounting' : null;
  const [preset, setPreset] = useState('today'); // الافتراضي: تقارير اليوم، ويمكن تغييره من القائمة
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [cashOpen, setCashOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [claimCompany, setClaimCompany] = useState(null); // اسم الشركة المفتوحة مطالبتها

  // شركات التأمين المسجَّلة + أي شركة وردت في فواتير سابقة (قد تكون حُذفت من القائمة)
  const companies = useMemo(
    () => [...new Set([...insuranceCompanies.map((c) => c.name), ...invoices.map((i) => i.insurance_company)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')),
    [insuranceCompanies, invoices]
  );

  const [from, to] = preset === 'custom' ? [custom.from, custom.to] : PRESETS[preset].range();

  // عند اختيار "فترة مخصّصة" نبدأ من الفترة المعروضة حالياً بدل حقول فارغة (فارغة = كل الفترات)
  const changePreset = (next) => {
    if (next === 'custom' && !custom.from && !custom.to) setCustom({ from, to });
    setPreset(next);
  };

  const accounting = useMemo(() => accountingReport({ invoices, purchases, from, to }), [invoices, purchases, from, to]);
  const admin = useMemo(() => adminReport({ patients, supplies, purchases, invoices, insuranceCompanies, from, to }), [patients, supplies, purchases, invoices, insuranceCompanies, from, to]);

  const registry = useMemo(() => patientsRegistry({ patients, from, to }), [patients, from, to]);
  const free = useMemo(() => freeServicesReport({ invoices, patients, from, to }), [invoices, patients, from, to]);

  const cash = useMemo(() => cashStatement({ invoices, from, to }), [invoices, from, to]);
  const claim = useMemo(
    () => (claimCompany ? insuranceClaim({ invoices, patients, company: claimCompany, from, to }) : null),
    [invoices, patients, claimCompany, from, to]
  );

  const periodLabel = from || to ? `من ${from ? formatDateDMY(from) : 'البداية'} إلى ${to ? formatDateDMY(to) : 'اليوم'}` : 'كل الفترات';

  const tabStyle = (active) => ({
    ...outlineGoldButtonStyle,
    background: active ? COLORS.soft : 'transparent',
    fontWeight: active ? '800' : '600',
  });

  return (
    <TabCard>
      <div className="no-print tab-header"><SectionHeader title="التقارير الإدارية والمحاسبية" description="ملخصات مالية وتشغيلية للفترة المختارة، قابلة للتصدير إلى Excel" icon={BarChart3} /></div>

      <div className="reports-toolbar">
        <div className="reports-toolbar-views">
          {canAccounting && <button type="button" onClick={() => setView('accounting')} style={tabStyle(view === 'accounting')}>التقارير المحاسبية</button>}
          {canAdmin && <button type="button" onClick={() => setView('admin')} style={tabStyle(view === 'admin')}>التقارير الإدارية</button>}
        </div>

        <div className="reports-toolbar-filters">
          {view && (
            <button type="button" onClick={() => printReport()} style={outlineGoldButtonStyle}>
              <Printer size={14} color={COLORS.gold} /> طباعة التقرير
            </button>
          )}

          {canAdmin && (
            <button type="button" onClick={() => setStatementOpen(true)} style={outlineGoldButtonStyle}>
              <FileText size={14} color={COLORS.gold} /> كشف حركة مادة
            </button>
          )}

          {canCash && (
            <button type="button" onClick={() => setCashOpen(true)} style={outlineGoldButtonStyle}>
              <Wallet size={14} color={COLORS.gold} /> معاينة الكشف النقدي
            </button>
          )}

          <select value={preset} onChange={(e) => changePreset(e.target.value)} className="warm-select" style={{ margin: 0, width: 'auto' }} aria-label="الفترة الزمنية">
            {Object.entries(PRESETS).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
          </select>
          {preset === 'custom' && (
            <>
              <input type="date" className="warm-input" style={{ margin: 0, width: 'auto' }} value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="من تاريخ" />
              <input type="date" className="warm-input" style={{ margin: 0, width: 'auto' }} value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="إلى تاريخ" />
            </>
          )}
        </div>
      </div>

      <div className="print-only report-print-header">
        <PrintHeader bare />
        <div className="rp-title" style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px' }}>{view === 'accounting' ? 'التقارير المحاسبية' : 'التقارير الإدارية'}</div>
        <div style={{ fontSize: '12px' }}>{periodLabel} • تاريخ الطباعة: {formatDateDMY(getToday())}</div>
      </div>

      {view === 'accounting' && <AccountingView data={accounting} free={free} onClaim={canClaims ? setClaimCompany : undefined} companies={companies} />}
      {view === 'admin' && <AdminView data={admin} free={free} registry={registry} />}
      {!view && <p style={{ textAlign: 'center', color: COLORS.muted, margin: '32px 0' }}>لا تملك صلاحية عرض أي قسم من التقارير. اطلب من مدير النظام منحك الصلاحية المناسبة.</p>}

      {statementOpen && canAdmin && <ItemStatementModal supplies={supplies} hearingAids={hearingAids} movements={movements} onClose={() => setStatementOpen(false)} />}
      {claim && canClaims && <InsuranceClaimModal data={claim} from={from} to={to} onClose={() => setClaimCompany(null)} />}
      {cashOpen && canCash && <CashStatementModal data={cash} from={from} to={to} onClose={() => setCashOpen(false)} />}
    </TabCard>
  );
}
