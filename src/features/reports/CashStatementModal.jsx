import { Download, Printer, Wallet } from 'lucide-react';
import { PrintHeader } from '../../components/common/PrintBrand';
import { COLORS, outlineGoldButtonStyle } from '../../styles';
import { formatDateDMY, formatMoney, getToday } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { printReport } from '../../utils/printReport';
import Modal from '../../components/common/Modal';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, paymentMethodLabel } from '../../constants';

// الورقة بيضاء وبحبر داكن دائماً (حتى في الوضع الداكن) لأنها كشف للطباعة
const paper = { background: '#fff', color: '#111', border: '1px solid #cfcfcf', borderRadius: '6px', padding: '28px 32px', fontSize: '13px', lineHeight: 1.7 };
// بلا nowrap: النص الطويل (الخدمة، اسم المريض) يلتفّ داخل عموده بدل أن يتجاوزه ويتداخل مع العمود المجاور عند الطباعة
const cell = { padding: '6px 10px', textAlign: 'right', verticalAlign: 'top', borderBottom: '1px solid #e0e0e0' };
const nowrap = { whiteSpace: 'nowrap' };
// عرض كل عمود (نسبة مئوية): يثبّت الجدول على الشاشة والطباعة فلا يتحرك عرض الأعمدة حسب المحتوى
const COLUMN_WIDTHS = ['10%', '15%', '28%', '9%', '7%', '8%', '9%', '14%'];
const COLS = COLUMN_WIDTHS.length;

// سطر ملخّص: مجموع كل طريقة دفع (نقدي / بطاقات) مفصولة بنقطة
const methodSummary = (byMethod) =>
  Object.values(PAYMENT_METHODS).map((m) => `${PAYMENT_METHOD_LABELS[m]}: ${formatMoney(byMethod[m] ?? 0)}`).join('  •  ');

const weekday = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('ar', { weekday: 'long' });
const periodText = (from, to) => (!from && !to ? 'كل الفترات' : `من ${from ? formatDateDMY(from) : 'البداية'} إلى ${to ? formatDateDMY(to) : 'اليوم'}`);

// معاينة الكشف النقدي: الدخل المقبوض يومياً بتفاصيل الدفعات (data من cashStatement)
export default function CashStatementModal({ data, from, to, userLabel, onClose }) {
  const exportCsv = () =>
    downloadCsv(
      `cash-statement-${getToday()}.csv`,
      ['التاريخ', 'رقم الفاتورة', 'المريض', 'الخدمة', 'شركة التأمين', 'تحمّل المريض', 'المستلم', 'طريقة الدفع', 'المبلغ المقبوض'],
      data.days.flatMap((d) => d.rows.map((r) => [d.date, r.invNo, r.patient, r.service, r.insuranceCompany, r.copayAmount ?? '', r.user, paymentMethodLabel(r.method), r.amount]))
    );

  return (
    <Modal title="كشف الإيراد اليومي" icon={Wallet} subtitle={`${periodText(from, to)}${userLabel ? ` • المستخدم: ${userLabel}` : ''}`} maxWidth={1600} onClose={onClose}>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' }}>
        <button type="button" onClick={exportCsv} disabled={data.count === 0} style={outlineGoldButtonStyle}>
          <Download size={14} color={COLORS.gold} /> تصدير CSV
        </button>
        <button type="button" onClick={() => printReport()} className="btn-warm-primary" style={{ padding: '8px 20px' }}>
          <Printer size={14} /> طباعة
        </button>
      </div>

      <div className="paper-sheet" style={paper}>
        <PrintHeader>
          <div>الكشف النقدي — تفاصيل الدخل اليومي</div>
          <div style={{ color: '#444' }}>{periodText(from, to)}{userLabel ? ` • المستخدم: ${userLabel}` : ''} • تاريخ الطباعة: {formatDateDMY(getToday())}</div>
        </PrintHeader>

        {data.count === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', margin: '24px 0' }}>لا توجد مقبوضات في هذه الفترة.</p>
        ) : (
          <div className="table-scroll">
          <table className="cash-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px', tableLayout: 'fixed' }}>
            <colgroup>
              {COLUMN_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead>
              <tr style={{ background: '#e9e9e9' }}>
                <th style={cell}>رقم الفاتورة</th>
                <th style={cell}>المريض</th>
                <th style={cell}>الخدمة</th>
                <th style={cell}>شركة التأمين</th>
                <th style={{...cell, textAlign: 'center'}}>تحمّل المريض</th>
                <th style={cell}>المستلم</th>
                <th style={{ ...cell, textAlign: 'center' }}>طريقة الدفع</th>
                <th style={{ ...cell, textAlign: 'left' }}>المبلغ المقبوض</th>
              </tr>
            </thead>
            {data.days.map((day) => (
              <tbody key={day.date} style={{ breakInside: 'avoid' }}>
                <tr style={{ background: '#f4f4f4' }}>
                  <td colSpan={COLS} style={{ ...cell, fontWeight: '800' }}>
                    {weekday(day.date)} — {formatDateDMY(day.date)}
                  </td>
                </tr>
                {day.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...cell, ...nowrap }}>{r.invNo}</td>
                    <td style={cell}>{r.patient}</td>
                    <td style={cell}>{r.refund ? 'مرتجع — ' : ''}{r.service}</td>
                    <td style={cell}>{r.insuranceCompany || '—'}</td>
                    <td style={{ ...cell, ...nowrap, textAlign: 'center' }}>{r.copayAmount == null ? '—' : r.copayAmount}</td>
                    <td style={cell}>{r.user || '—'}</td>
                    <td style={{ ...cell, ...nowrap, textAlign: 'center' }}>{paymentMethodLabel(r.method)}</td>
                    <td style={{ ...cell, ...nowrap, textAlign: 'left' }}>
                      {formatMoney(r.amount)}
                      {r.legacy && ' *'}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={COLS - 1} style={{ ...cell, fontWeight: '800' }}>
                    إجمالي اليوم ({day.rows.length} {day.rows.length === 1 ? 'دفعة' : 'دفعات'})
                    <span style={{ fontWeight: '600', color: '#444', marginRight: '12px' }}>{methodSummary(day.byMethod)}</span>
                  </td>
                  <td style={{ ...cell, ...nowrap, textAlign: 'left', fontWeight: '800' }}>{formatMoney(day.total)}</td>
                </tr>
              </tbody>
            ))}
            <tfoot>
              <tr style={{ background: '#e9e9e9' }}>
                <td colSpan={COLS - 1} style={{ ...cell, fontWeight: '800', fontSize: '14px' }}>
                  إجمالي الدخل ({data.days.length} {data.days.length === 1 ? 'يوم' : 'أيام'} • {data.count} دفعة)
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#222', marginTop: '2px' }}>{methodSummary(data.byMethod)}</div>
                </td>
                <td style={{ ...cell, ...nowrap, textAlign: 'left', fontWeight: '800', fontSize: '14px' }}>{formatMoney(data.total)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        )}

        {data.hasLegacy && (
          <p style={{ margin: '12px 0 0', fontSize: '11px', color: '#555' }}>
            * دفعات مسجَّلة قبل تتبّع تاريخ القبض، وتُحسب بتاريخ إصدار الفاتورة.
          </p>
        )}
        <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#555' }}>
          يشمل المقبوض من المرضى فقط؛ مطالبات شركات التأمين غير داخلة فيه حتى تُحصَّل. المبالغ السالبة = مردودات للعملاء بسبب مرتجع مبيعات.
        </p>
      </div>
    </Modal>
  );
}
