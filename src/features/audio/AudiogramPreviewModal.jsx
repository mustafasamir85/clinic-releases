import { useState } from 'react';
import { PrintHeader } from '../../components/common/PrintBrand';
import { ChevronLeft, ChevronRight, Printer, Ear } from 'lucide-react';
import { COLORS, smallOutlineButtonStyle } from '../../styles';
import { formatDateDMY, getFileNumber } from '../../utils/format';
import Modal from '../../components/common/Modal';
import { Audiogram, FREQS, audiogramSummary } from './Audiogram';
import { printReport } from '../../utils/printReport';

const ROWS = [
  { ear: 'right', type: 'air', label: 'اليمنى — هوائي' },
  { ear: 'left', type: 'air', label: 'اليسرى — هوائي' },
  { ear: 'right', type: 'bone', label: 'اليمنى — عظمي' },
  { ear: 'left', type: 'bone', label: 'اليسرى — عظمي' },
];

const cell = { padding: '6px 8px', textAlign: 'center', borderBottom: `1px solid ${COLORS.border}`, fontSize: '13px', color: COLORS.ink };

// معاينة تخطيطات السمع المحفوظة للمريض بحجم كبير، مع التنقل بين الزيارات والطباعة.
// visits: الزيارات التي لها تخطيط (الأقدم أولاً). initialVisitId: الزيارة المطلوب فتحها.
export default function AudiogramPreviewModal({ patient, visits, initialVisitId, onClose }) {
  const [index, setIndex] = useState(Math.max(0, visits.findIndex((v) => v.id === initialVisitId)));
  const visit = visits[index];
  const summary = audiogramSummary(visit.audiogram);

  return (
    <Modal
      title="تخطيط السمع"
      icon={Ear}
      subtitle={<>الإسم: <strong style={{ color: COLORS.gold }}>{patient.name}</strong> ({getFileNumber(patient)}) • زيارة {formatDateDMY(visit.date)}</>}
      maxWidth={720}
      onClose={onClose}
    >
      <div className="audiogram-preview-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="الأقدم" style={smallOutlineButtonStyle}><ChevronRight size={16} /></button>
          <span style={{ fontSize: '13px', fontWeight: '700', color: COLORS.muted }}>{index + 1} من {visits.length}</span>
          <button type="button" disabled={index === visits.length - 1} onClick={() => setIndex(index + 1)} aria-label="الأحدث" style={smallOutlineButtonStyle}><ChevronLeft size={16} /></button>
        </div>
        <button type="button" onClick={() => printReport({ orientation: 'portrait', bodyClass: 'print-audiogram' })} className="btn-warm-primary" style={{ padding: '8px 18px' }}>
          <Printer size={16} /> طباعة
        </button>
      </div>

      <div className="audiogram-print-page">
        <div className="print-only audiogram-print-header">
          <PrintHeader bare />
          <strong className="audiogram-print-title">تخطيط السمع</strong>
          <span>الأسم: {patient.name} • رقم الملف: {getFileNumber(patient)} • تاريخ الزيارة: {formatDateDMY(visit.date)}</span>
        </div>

        <Audiogram value={visit.audiogram} />

        {summary && <p className="audiogram-print-summary" style={{ margin: '12px 0 0 0', fontWeight: '700', fontSize: '13.5px', color: COLORS.ink }}>{summary}</p>}

        <div className="audiogram-print-values" style={{ overflowX: 'auto', marginTop: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: COLORS.card }}>
            <thead>
              <tr style={{ background: COLORS.soft }}>
                <th style={{ ...cell, textAlign: 'right', fontWeight: '800' }}>التوصيل</th>
                {FREQS.map((f) => <th key={f} style={{ ...cell, fontWeight: '800' }}>{f} Hz</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={`${r.ear}-${r.type}`}>
                  <td style={{ ...cell, textAlign: 'right', fontWeight: '700' }}>{r.label}</td>
                  {FREQS.map((f) => <td key={f} style={cell}>{visit.audiogram?.[r.ear]?.[r.type]?.[f] ?? '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="audiogram-print-unit" style={{ margin: '8px 0 0 0', fontSize: '11px', color: COLORS.faint }}>القيم بوحدة dB HL.</p>
      </div>
    </Modal>
  );
}
