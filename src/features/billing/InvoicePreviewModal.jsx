import { X } from 'lucide-react';
import { PrintHeader } from '../../components/common/PrintBrand';
import { DOCTOR_NAME, INVOICE_STATUS } from '../../constants';
import { COLORS } from '../../styles';
import { formatDateDMY, formatMoney, formatUser } from '../../utils/format';
import Modal from '../../components/common/Modal';
import { invoiceItems, patientDue } from '../../hooks/useInvoices';
import StatusBadge from '../../components/common/StatusBadge';
import { printReport } from '../../utils/printReport';

export default function InvoicePreviewModal({ invoice, onClose }) {
  const isPaid = invoice.status === INVOICE_STATUS.PAID;
  const issuer = formatUser(invoice.created_by, invoice.created_by_username);
  // من استلم النقد: سجل الدفعات (يحوي المستخدم الذي قبض كل دفعة)، ثم ما دُفع قبل تتبّع الدفعات (قديم، بلا مستلم)
  const logged = Array.isArray(invoice.payments) ? invoice.payments : [];
  const legacyPaid = Math.round(((Number(invoice.paid) || 0) - logged.reduce((t, p) => t + (Number(p.amount) || 0), 0)) * 100) / 100;
  // أسماء من استلموا النقد (بلا تكرار) لتظهر في أعلى الفاتورة
  const receivers = [...new Set(logged.map((p) => p.by).filter(Boolean))];
  const receipts = [...logged, ...(legacyPaid > 0 ? [{ date: invoice.date, amount: legacyPaid, by: '' }] : [])];

  const header = (
    <div style={{ position: 'relative', borderBottom: `2px solid ${COLORS.gold}`, paddingBottom: '12px', marginBottom: '16px' }}>
      <PrintHeader bare />
      <button className="no-print" onClick={onClose} aria-label="إغلاق" style={{ position: 'absolute', top: 0, left: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}>
        <X size={20} color={COLORS.muted} />
      </button>
    </div>
  );

  return (
    <Modal maxWidth={560} header={header} onClose={onClose}>
      <h2 style={{ textAlign: 'center', margin: '0 0 14px', fontSize: '22px', fontWeight: '800', color: COLORS.ink }}>فاتورة</h2>

      <div style={{ background: COLORS.card, padding: '16px', borderRadius: '12px', border: `1px solid ${COLORS.border}`, marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
          <div><strong style={{ color: COLORS.muted }}>رقم الفاتورة:</strong> <span style={{ fontWeight: '800', color: COLORS.gold }}>{invoice.inv_no}</span></div>
          <div><strong style={{ color: COLORS.muted }}>تاريخ الإصدار:</strong> <span>{formatDateDMY(invoice.date)}</span></div>
        </div>
        <div style={{ fontSize: '13px' }}>
          <strong style={{ color: COLORS.muted }}>الإسم:</strong>{' '}
          <span style={{ fontWeight: '800', color: COLORS.ink, fontSize: '15px' }}>{invoice.patient_name}</span>
        </div>
        {receivers.length > 0 && (
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            <strong style={{ color: COLORS.muted }}>المستلم:</strong> <span style={{ fontWeight: '700' }}>{receivers.join('، ')}</span>
          </div>
        )}
        {issuer && (
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            <strong style={{ color: COLORS.muted }}>المستخدم:</strong> <span style={{ fontWeight: '700' }}>{issuer}</span>
          </div>
        )}
      </div>

      <div className="table-scroll" style={{ marginBottom: '20px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: COLORS.primary, color: COLORS.onPrimary }}>
            <th style={{ padding: '10px', textAlign: 'right' }}>البند / الخدمة</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>الكمية</th>
            <th style={{ padding: '10px', textAlign: 'center' }}>السعر</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {invoiceItems(invoice).map((item, idx) => (
            <tr key={item.id ?? idx} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <td style={{ padding: '10px', fontWeight: '700', color: COLORS.ink }}>{item.description}</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>{item.qty}</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>{formatMoney(item.price)}</td>
              <td style={{ padding: '10px', textAlign: 'left', fontWeight: '800', color: COLORS.gold }}>{formatMoney(Math.round(item.qty * item.price * 100) / 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div style={{ marginBottom: '12px' }}>
        <StatusBadge tone={isPaid ? 'success' : 'warning'}>{invoice.status}</StatusBadge>
      </div>

      {invoice.insurance_amount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', background: COLORS.successBg, color: COLORS.successText, padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>
          <span>🛡️ {invoice.insurance_company} — حصة التأمين: {formatMoney(invoice.insurance_amount)}</span>
          <span>قيمة التحمل: {formatMoney(patientDue(invoice))}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', background: COLORS.soft, padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '800', marginBottom: '20px' }}>
        <span>المبلغ المدفوع: <span style={{ color: COLORS.successText }}>{formatMoney(invoice.paid)}</span></span>
        <span>الإجمالي الكلي: <span style={{ color: COLORS.gold }}>{formatMoney(invoice.total)}</span></span>
      </div>

      {receipts.length > 0 && (
        <div style={{ marginBottom: '16px', fontSize: '13px' }}>
          <strong style={{ color: COLORS.muted }}>الدفعات المستلمة:</strong>
          <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {receipts.map((p, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: `1px dashed ${COLORS.border}`, paddingBottom: '4px' }}>
                <span>{formatDateDMY(p.date)} — استلمها: <strong>{p.by || '—'}</strong></span>
                <strong style={{ color: COLORS.successText }}>{formatMoney(p.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span> تمنياتنا لكم بالشفاء العاجل </span>
        <button type="button" onClick={() => printReport({ orientation: 'portrait' })} className="btn-warm-primary" style={{ padding: '8px 20px' }}>
          طباعة الفاتورة
        </button>
      </div>
    </Modal>
  );
}
