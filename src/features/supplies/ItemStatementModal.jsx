import { useMemo, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { PrintHeader } from '../../components/common/PrintBrand';
import Modal from '../../components/common/Modal';
import { COLORS, outlineGoldButtonStyle } from '../../styles';
import { formatDateDMY, getToday } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import { printReport } from '../../utils/printReport';
import { itemStatement, statementItems } from './itemStatement';

// الورقة بيضاء وبحبر داكن دائماً لأنها كشف للطباعة
const paper = { background: '#fff', color: '#111', border: '1px solid #cfcfcf', borderRadius: '6px', padding: '28px 32px', fontSize: '13px', lineHeight: 1.7 };
const cell = { padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #e0e0e0' };
const periodText = (from, to) => (!from && !to ? 'كل الفترات' : `من ${from ? formatDateDMY(from) : 'البداية'} إلى ${to ? formatDateDMY(to) : 'اليوم'}`);

// كشف حركة مادة: وارد/صادر/رصيد لكل حركة مع من نفّذها (إضافة، استهلاك، بيع، إرجاع، جرد، حذف)
export default function ItemStatementModal({ supplies, hearingAids = [], movements, initialKey = '', onClose }) {
  const items = useMemo(() => statementItems({ supplies, hearingAids, movements }), [supplies, hearingAids, movements]);
  const [key, setKey] = useState(initialKey || items[0]?.key || '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const item = items.find((i) => i.key === key) ?? null;
  const data = useMemo(() => (item ? itemStatement({ movements, item, from, to }) : null), [item, movements, from, to]);

  const exportCsv = () =>
    downloadCsv(
      `item-statement-${getToday()}.csv`,
      ['التاريخ', 'الحركة', 'البيان', 'المستخدم', 'وارد', 'صادر', 'الرصيد'],
      [['', 'رصيد افتتاحي', '', '', '', '', data.opening], ...data.rows.map((r) => [r.date, r.label, r.note, r.user, r.inQty || '', r.outQty || '', r.balance])]
    );

  const noPrint = { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '12px' };

  return (
    <Modal title="كشف حركة مادة" icon={FileText} maxWidth={1100} onClose={onClose}>
      <div className="no-print" style={noPrint}>
        <label style={{ flex: '2 1 240px', fontSize: '12px', fontWeight: '700', color: COLORS.muted }}>
          المادة
          <select className="warm-input" value={key} onChange={(e) => setKey(e.target.value)} style={{ width: '100%' }}>
            {['supply', 'hearing_aid'].map((type) => {
              const group = items.filter((i) => i.type === type);
              return group.length === 0 ? null : (
                <optgroup key={type} label={type === 'supply' ? 'المستلزمات' : 'السماعات'}>
                  {group.map((i) => <option key={i.key} value={i.key}>{i.name}{i.deleted ? ' (محذوف)' : ''}</option>)}
                </optgroup>
              );
            })}
          </select>
        </label>
        <label style={{ flex: '1 1 140px', fontSize: '12px', fontWeight: '700', color: COLORS.muted }}>
          من تاريخ
          <input type="date" className="warm-input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} style={{ width: '100%' }} />
        </label>
        <label style={{ flex: '1 1 140px', fontSize: '12px', fontWeight: '700', color: COLORS.muted }}>
          إلى تاريخ
          <input type="date" className="warm-input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} style={{ width: '100%' }} />
        </label>
        <button type="button" onClick={exportCsv} disabled={!data} style={outlineGoldButtonStyle}>
          <Download size={14} color={COLORS.gold} /> تصدير CSV
        </button>
        <button type="button" onClick={() => printReport()} disabled={!data} className="btn-warm-primary" style={{ padding: '8px 20px' }}>
          <Printer size={14} /> طباعة
        </button>
      </div>

      {!item ? (
        <p style={{ textAlign: 'center', color: COLORS.faint, padding: '20px' }}>لا توجد مواد لإصدار كشف لها.</p>
      ) : (
        <div className="paper-sheet" style={paper}>
          <PrintHeader>
            <div>كشف حركة مادة: {item.name}{item.deleted ? ' (محذوف)' : ''}</div>
            <div style={{ color: '#444' }}>{periodText(from, to)} • تاريخ الطباعة: {formatDateDMY(getToday())}</div>
          </PrintHeader>

          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
              <thead>
                <tr style={{ background: '#e9e9e9' }}>
                  <th style={cell}>التاريخ</th>
                  <th style={cell}>الحركة</th>
                  <th style={cell}>البيان</th>
                  <th style={cell}>المستخدم</th>
                  <th style={{ ...cell, textAlign: 'center' }}>وارد</th>
                  <th style={{ ...cell, textAlign: 'center' }}>صادر</th>
                  <th style={{ ...cell, textAlign: 'center' }}>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#f4f4f4' }}>
                  <td style={{ ...cell, fontWeight: '800' }} colSpan={6}>رصيد افتتاحي</td>
                  <td style={{ ...cell, textAlign: 'center', fontWeight: '800' }}>{data.opening}</td>
                </tr>
                {data.rows.length === 0 && (
                  <tr><td colSpan={7} style={{ ...cell, textAlign: 'center', color: '#666' }}>لا توجد حركات في هذه الفترة.</td></tr>
                )}
                {data.rows.map((r) => (
                  <tr key={r.id} style={{ breakInside: 'avoid' }}>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{formatDateDMY(r.date)}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{r.label}</td>
                    <td style={cell}>{r.note || '—'}</td>
                    <td style={cell}>{r.user || '—'}</td>
                    <td style={{ ...cell, textAlign: 'center', color: '#0a6b2d' }}>{r.inQty || ''}</td>
                    <td style={{ ...cell, textAlign: 'center', color: '#b42318' }}>{r.outQty || ''}</td>
                    <td style={{ ...cell, textAlign: 'center', fontWeight: '700' }}>{r.balance}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#e9e9e9', fontWeight: '800' }}>
                  <td style={cell} colSpan={4}>الإجمالي</td>
                  <td style={{ ...cell, textAlign: 'center' }}>{data.totalIn}</td>
                  <td style={{ ...cell, textAlign: 'center' }}>{data.totalOut}</td>
                  <td style={{ ...cell, textAlign: 'center' }}>{data.closing}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#555' }}>
            الرصيد الحالي في المخزون: {data.current}. الحركات القديمة المسجَّلة قبل تتبّع المستخدم يظهر مستخدمها «—».
          </p>
        </div>
      )}
    </Modal>
  );
}
