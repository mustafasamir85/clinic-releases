import { Download, Printer, ShieldCheck } from 'lucide-react';
import { PrintHeader } from '../../components/common/PrintBrand';
import { DOCTOR_NAME } from '../../constants';
import { COLORS, outlineGoldButtonStyle } from '../../styles';
import { formatDateDMY, formatMoney, getToday } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { printReport } from '../../utils/printReport';
import Modal from '../../components/common/Modal';

// الورقة بيضاء وبحبر داكن دائماً (حتى في الوضع الداكن) لأنها مستند للطباعة والإرسال
const paper = { background: '#fff', color: '#111', border: '1px solid #cfcfcf', borderRadius: '6px', padding: '28px 32px', fontSize: '13px', lineHeight: 1.7 };
const cell = { padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e0e0e0', verticalAlign: 'top' };
const num = { ...cell, textAlign: 'left', whiteSpace: 'nowrap' };

const periodText = (from, to) => (!from && !to ? 'كل الفترات' : `من ${from ? formatDateDMY(from) : 'البداية'} إلى ${to ? formatDateDMY(to) : 'اليوم'}`);

const Info = ({ label, value }) => (
  <div style={{ minWidth: 0 }}>
    <span style={{ color: '#666', fontSize: '11px' }}>{label}: </span>
    <strong style={{ overflowWrap: 'anywhere' }}>{value || '—'}</strong>
  </div>
);

const itemsText = (items) => items.map((i) => (Number(i.qty) > 1 ? `${i.description} ×${i.qty}` : i.description)).join('، ');

// معاينة وطباعة مطالبة شركة تأمين: كل مريض ببياناته الكاملة وفواتيره، ثم إجمالي المطالبة (data من insuranceClaim)
export default function InsuranceClaimModal({ data, from, to, onClose }) {
  const exportCsv = () =>
    downloadCsv(
      `claim-${data.company}-${getToday()}.csv`,
      ['رقم الملف', 'المريض', 'رقم الفاتورة', 'التاريخ', 'القسم', 'الخدمات', 'الإجمالي', 'حصة الشركة', 'حصة المريض'],
      data.groups.flatMap((g) =>
        g.rows.map((r) => [
          g.patient?.file_number ?? '', g.name,
          r.inv.inv_no, r.inv.date, r.visit?.department ?? '', itemsText(r.items), r.inv.total, r.share, r.patientShare,
        ])
      )
    );

  return (
    <Modal title="مطالبة شركة التأمين" icon={ShieldCheck} subtitle={`${data.company} • ${periodText(from, to)}`} maxWidth={940} onClose={onClose}>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' }}>
        <button type="button" onClick={exportCsv} disabled={data.invoiceCount === 0} style={outlineGoldButtonStyle}>
          <Download size={14} color={COLORS.gold} /> تصدير CSV
        </button>
        <button type="button" onClick={() => printReport()} disabled={data.invoiceCount === 0} className="btn-warm-primary" style={{ padding: '8px 20px' }}>
          <Printer size={14} /> طباعة
        </button>
      </div>

      <div className="paper-sheet" style={paper}>
        <PrintHeader>
          <div>مطالبة مالية — {data.company}</div>
          <div style={{ color: '#444' }}>
            {periodText(from, to)} • تاريخ الإصدار: {formatDateDMY(getToday())} • عدد المرضى: {data.groups.length} • عدد الفواتير: {data.invoiceCount}
          </div>
        </PrintHeader>

        {data.invoiceCount === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', margin: '24px 0' }}>لا توجد فواتير لهذه الشركة في الفترة المختارة.</p>
        ) : (
          data.groups.map((g, idx) => (
            <section key={g.key} style={{ marginBottom: '18px', breakInside: 'avoid' }}>
              <div style={{ background: '#f4f4f4', border: '1px solid #d8d8d8', borderRadius: '6px 6px 0 0', padding: '8px 12px' }}>
                <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>{idx + 1}. {g.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '2px 16px' }} className="grid-2m">
                  <Info label="رقم الملف" value={g.patient?.file_number} />
                  <Info label="تحمّل المريض لكل فاتورة" value={g.patient?.insurance_copay !== '' && g.patient?.insurance_copay != null ? formatMoney(g.patient.insurance_copay) : ''} />
                </div>
              </div>

              <div className="table-scroll" style={{ border: '1px solid #d8d8d8', borderTop: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: '#e9e9e9' }}>
                      <th style={cell}>رقم الفاتورة</th>
                      <th style={cell}>التاريخ</th>
                      <th style={cell}>القسم / التفاصيل</th>
                      <th style={cell}>الخدمات المقدَّمة</th>
                      <th style={{ ...cell, textAlign: 'left' }}>الإجمالي</th>
                      <th style={{ ...cell, textAlign: 'left' }}>حصة الشركة</th>
                      <th style={{ ...cell, textAlign: 'left' }}>حصة المريض</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.inv.id}>
                        <td style={cell}>{r.inv.inv_no}</td>
                        <td style={cell}>{formatDateDMY(r.inv.date)}</td>
                        <td style={cell}>
                          {r.visit?.department && <div style={{ fontWeight: '700' }}>{r.visit.department}</div>}
                          {r.visit?.summary && <div style={{ fontSize: '11px', color: '#444' }}>{r.visit.summary}</div>}
                          {!r.visit && '—'}
                        </td>
                        <td style={cell}>{itemsText(r.items)}</td>
                        <td style={num}>{formatMoney(r.inv.total)}</td>
                        <td style={num}>{formatMoney(r.share)}</td>
                        <td style={num}>{formatMoney(r.patientShare)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f4f4f4' }}>
                      <td colSpan={4} style={{ ...cell, fontWeight: '800' }}>إجمالي المريض ({g.rows.length} {g.rows.length === 1 ? 'فاتورة' : 'فواتير'})</td>
                      <td style={{ ...num, fontWeight: '800' }}>{formatMoney(g.total)}</td>
                      <td style={{ ...num, fontWeight: '800' }}>{formatMoney(g.share)}</td>
                      <td style={{ ...num, fontWeight: '800' }}>{formatMoney(g.patientShare)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}

        {data.invoiceCount > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px 20px', background: '#e9e9e9', border: '1px solid #cfcfcf', borderRadius: '6px', padding: '10px 14px', fontWeight: '800', fontSize: '14px', breakInside: 'avoid' }}>
              <span>إجمالي الفواتير: {formatMoney(data.total)}</span>
              <span>حصة المرضى: {formatMoney(data.patientShare)}</span>
              <span>المبلغ المطلوب من {data.company}: {formatMoney(data.share)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', marginTop: '26px', fontSize: '12px', breakInside: 'avoid' }}>
              <div>
                <div style={{ borderTop: '1px solid #111', width: '170px', marginTop: '28px' }} />
                <div style={{ color: '#555' }}>التوقيع</div>
              </div>
              <div style={{ border: '1px dashed #999', width: '110px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#777' }}>ختم المؤسسة</div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
