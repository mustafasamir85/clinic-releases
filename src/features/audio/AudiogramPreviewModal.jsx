import { useState } from 'react';
import { PrintHeader } from '../../components/common/PrintBrand';
import { ChevronLeft, ChevronRight, Printer, Ear } from 'lucide-react';
import { COLORS, smallOutlineButtonStyle } from '../../styles';
import { formatDateDMY, getFileNumber } from '../../utils/format';
import Modal from '../../components/common/Modal';
import { Audiogram, AudiogramLegend, FREQS, audiogramSummary } from './Audiogram';
import { printReport } from '../../utils/printReport';
import { guessEnglishName } from '../documents/documentUtils';

const ROWS = [
  { ear: 'right', type: 'air', label: 'Rt — AC' },
  { ear: 'left', type: 'air', label: 'Lt — AC' },
  { ear: 'right', type: 'bone', label: 'Rt — BC' },
  { ear: 'left', type: 'bone', label: 'Lt — BC' },
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
      title="فحص السمع"
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

      <div className="audiogram-print-page" dir="ltr">
        <div className="print-only audiogram-print-header">
          <PrintHeader bare />
          <strong className="audiogram-print-title">Hearing Test (Audiogram)</strong>
          <span>Name: {guessEnglishName(patient) || patient.name} • File No.: {getFileNumber(patient)} • Visit Date: {formatDateDMY(visit.date)}</span>
        </div>

        <Audiogram value={visit.audiogram} />
        <AudiogramLegend/>

        {summary && (
          <div className="audiogram-print-summary audiogram-result audiogram-result--primary">
            <div dir='ltr' style={{textAlign:'left'}}><u>Result:</u></div>
            {summary}
          </div>
        )}

        <div dir="ltr" className="audiogram-print-values" style={{ overflowX: 'auto', marginTop: '14px', border: `1px solid ${COLORS.border}`, borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: COLORS.card }}>
            <thead>
              <tr style={{ background: COLORS.soft }}>
                <th style={{ ...cell, textAlign: 'left', fontWeight: '800' }}>Frequency</th>
                {FREQS.map((f) => <th key={f} style={{ ...cell, fontWeight: '800' }}>{f} Hz</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={`${r.ear}-${r.type}`}>
                  <td style={{ ...cell, textAlign: 'left', fontWeight: '700' }}>{r.label}</td>
                  {FREQS.map((f) => {
                    const v = visit.audiogram?.[r.ear]?.[r.type]?.[f];
                    const m = visit.audiogram?.[r.ear]?.masked?.[r.type]?.[f];
                    return <td key={f} style={cell}>{v ?? '—'}{v != null && m && <sup style={{ fontWeight: '800', marginRight: '2px' }}>M</sup>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="audiogram-print-unit" style={{ margin: '8px 0 0 0', fontSize: '11px', color: COLORS.faint }}>Values are in dB HL. (M) = Masked.</p>
      <div className='print-leave-signature' style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', direction: 'ltr', marginTop: '40px', fontSize: '14px', width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <div>Signature</div>
            <div style={{ borderTop: '1px solid #111', width: '180px', marginTop: '4px' }} />
          </div>
          <div style={{ textAlign: 'center', alignSelf: 'flex-end', color: '#777' }}>
            <div style={{ border: '1px dashed #999', width: '110px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>Official Stamp</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
