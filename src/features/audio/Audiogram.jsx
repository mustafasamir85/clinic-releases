import { useState } from 'react';
import { Eraser } from 'lucide-react';
import { COLORS } from '../../styles';

// ===== البيانات =====
// القيمة: { right: { air: { 250: 20, ... }, bone: {...} }, left: { ... } } — المفاتيح الترددات (Hz) والقيم dB HL
export const FREQS = [250, 500, 1000, 2000, 4000, 8000];
export const EMPTY_AUDIOGRAM = { right: { air: {}, bone: {} }, left: { air: {}, bone: {} } };

const RIGHT = '#e5646e'; // الأذن اليمنى حمراء حسب المعيار الدولي
const LEFT = '#5b9bf0'; // واليسرى زرقاء

const SERIES = [
  { ear: 'right', type: 'air', label: 'Rt — AC', color: RIGHT, symbol: 'O' },
  { ear: 'left', type: 'air', label: 'Lt — AC', color: LEFT, symbol: 'X' },
  { ear: 'right', type: 'bone', label: 'Rt — BC', color: RIGHT, symbol: '<' },
  { ear: 'left', type: 'bone', label: 'Lt — BC', color: LEFT, symbol: '>' },
];
const seriesKey = (s) => `${s.ear}-${s.type}`;
const EAR_NAME = { right: 'Right ear', left: 'Left ear' };

const getVal = (a, s, f) => a?.[s.ear]?.[s.type]?.[f];
// هل النقطة مقنَّعة (masked)؟ تُخزَّن الأعلام في a[ear].masked[type][freq] = true، وغيابها يعني غير مقنَّعة (unmasked)
export const isMasked = (a, s, f) => Boolean(a?.[s.ear]?.masked?.[s.type]?.[f]);

export const hasAudiogram = (a) =>
  SERIES.some((s) => Object.values(a?.[s.ear]?.[s.type] ?? {}).some((v) => v !== null && v !== undefined));

// تصنيف درجة الفقد السمعي (dB HL) حسب متوسط 500/1000/2000
export const classifyLoss = (db) =>
  db <= 25 ? 'Normal hearing' : db <= 40 ? 'Mild hearing loss' : db <= 55 ? 'Moderate hearing loss' : db <= 70 ? 'Moderately severe hearing loss' : db <= 90 ? 'Severe hearing loss' : 'Profound hearing loss';

// متوسط النغمة النقية للأذن (يتطلب الترددات الثلاثة)
export function pureToneAverage(a, ear) {
  const vals = [500, 1000, 2000].map((f) => a?.[ear]?.air?.[f]);
  if (vals.some((v) => v === null || v === undefined)) return null;
  return Math.round(vals.reduce((t, v) => t + v, 0) / 3);
}

// نص مختصر للنتيجة (للملخص وعرض الزيارة)
export function audiogramSummary(a) {
  return ['right', 'left']
    .map((ear) => {
      const avg = pureToneAverage(a, ear);
      return avg === null ? null : `${EAR_NAME[ear]}: ${classifyLoss(avg)}`; // بدون قيمة dB
    })
    .filter(Boolean)
    .join(' | ');
}

// ===== الرسم =====
const W = 620;
const H = 440;
const M = { left: 56, right: 20, top: 40, bottom: 20 };
const DB_MIN = -10;
const DB_MAX = 120;
const plotW = W - M.left - M.right;
const plotH = H - M.top - M.bottom;
const xOf = (i) => M.left + (plotW / (FREQS.length - 1)) * i;
const yOf = (db) => M.top + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * plotH;
const DB_TICKS = Array.from({ length: (DB_MAX - DB_MIN) / 10 + 1 }, (_, i) => DB_MIN + i * 10);

function Mark({ s, x, y, masked }) {
  const p = { stroke: s.color, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  // غير مقنَّع: O / X / < / >    —    مقنَّع: △ / □ / [ / ]
  if (s.symbol === 'O') return masked ? <path d={`M${x} ${y - 8}L${x + 8} ${y + 6}L${x - 8} ${y + 6}Z`} {...p} /> : <circle cx={x} cy={y} r="7" {...p} />;
  if (s.symbol === 'X') return masked ? <rect x={x - 6.5} y={y - 6.5} width="13" height="13" {...p} /> : <path d={`M${x - 6} ${y - 6}L${x + 6} ${y + 6}M${x + 6} ${y - 6}L${x - 6} ${y + 6}`} {...p} />;
  if (s.symbol === '<') return masked ? <path d={`M${x + 3} ${y - 8}L${x - 3} ${y - 8}L${x - 3} ${y + 8}L${x + 3} ${y + 8}`} {...p} /> : <path d={`M${x + 5} ${y - 7}L${x - 5} ${y}L${x + 5} ${y + 7}`} {...p} />;
  return masked ? <path d={`M${x - 3} ${y - 8}L${x + 3} ${y - 8}L${x + 3} ${y + 8}L${x - 3} ${y + 8}`} {...p} /> : <path d={`M${x - 5} ${y - 7}L${x + 5} ${y}L${x - 5} ${y + 7}`} {...p} />;
}

// رموز العرض النصية (للجداول والمفتاح): غير مقنَّع / مقنَّع
const SYMBOL_TEXT = { O: ['O', '△'], X: ['X', '□'], '<': ['<', '['], '>': ['>', ']'] };
const symbolText = (s, masked) => SYMBOL_TEXT[s.symbol][masked ? 1 : 0];

// مفتاح الرموز (Legend) تحت المخطط

export function AudiogramLegend() {
  const cellStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // <--- هذا هو السر لتوسيط العناصر أفقياً داخل الفليكس
    gap: '6px',
    fontSize: '12px',
    color: COLORS.muted,
    padding: '4px 8px',
    border: `1px solid ${COLORS.border}`,
    borderRadius: '8px',
    background: COLORS.white,
    minWidth: '105px', // (اختياري) لضمان أن جميع المربعات بنفس العرض تقريباً لتبدو مرتبة
  };

  const key = (s, masked) => (
    <span key={`${seriesKey(s)}-${masked}`} style={cellStyle}>
      <svg
        width="22"
        height="22"
        viewBox="-11 -11 22 22"
        style={{ direction: 'ltr' }}
      >
        <Mark s={s} x={0} y={0} masked={masked} />
      </svg>
      {s.label}
    </span>
  );

  return (
    <table
      className="audiogram-legend-table"
      style={{
        width: '100%',
        direction: 'ltr',
        marginTop: '10px',
        borderCollapse: 'collapse',
        border: `1px solid ${COLORS.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      <tbody>
        {/* الصف الأول: Unmasked */}
        <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <td
            style={{
              padding: '8px 12px',
              verticalAlign: 'middle',
              width: '110px',
              borderRight: `1px solid ${COLORS.border}`,
              background: COLORS.soft,
            }}
          >
            <strong style={{ fontSize: '12px', color: COLORS.ink }}>
              Unmasked
            </strong>
          </td>
          <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '8px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {SERIES.map((s) => key(s, false))}
            </div>
          </td>
        </tr>

        {/* الصف الثاني: Masked */}
        <tr>
          <td
            style={{
              padding: '8px 12px',
              verticalAlign: 'middle',
              width: '110px',
              borderRight: `1px solid ${COLORS.border}`,
              background: COLORS.soft,
            }}
          >
            <strong style={{ fontSize: '12px', color: COLORS.ink }}>
              Masked
            </strong>
          </td>
          <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '8px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {SERIES.map((s) => key(s, true))}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}


// مخطط التخطيط. إن مُرّرت onPlot(series, freq, db) يصبح النقر على المخطط يضع النقطة.
export function Audiogram({ value, onPlot, activeKey, masked = false }) {
  const handleClick = (e) => {
    if (!onPlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    if (x < M.left - 12 || x > W - M.right + 12 || y < M.top - 12 || y > H - M.bottom + 12) return;

    // أقرب تردد، وأقرب 5 dB، ضمن حدود المحور
    let idx = 0;
    FREQS.forEach((_, i) => {
      if (Math.abs(xOf(i) - x) < Math.abs(xOf(idx) - x)) idx = i;
    });
    const raw = DB_MIN + ((y - M.top) / plotH) * (DB_MAX - DB_MIN);
    const db = Math.min(DB_MAX, Math.max(DB_MIN, Math.round(raw / 5) * 5));
    onPlot(SERIES.find((s) => seriesKey(s) === activeKey), FREQS[idx], db, masked);
  };

  return (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '80%', maxWidth: W, height: 'auto', margin: '0 auto' , display: 'block', cursor: onPlot ? 'crosshair' : 'default', background: COLORS.white, borderRadius: '12px', border: `1px solid ${COLORS.border}`, direction: 'ltr' }}
          onClick={handleClick}
          role="img"
          aria-label="Audiogram"
        >
          {/* نطاق السمع الطبيعي 0–25 dB */}
          <rect x={M.left} y={yOf(0)} width={plotW} height={yOf(25) - yOf(0)} fill={LEFT} opacity="0.08" />

          {DB_TICKS.map((db) => (
            <g key={db}>
              <line x1={M.left} x2={W - M.right} y1={yOf(db)} y2={yOf(db)} stroke={COLORS.border} strokeWidth={db % 20 === 0 ? 1 : 0.5} />
              {db % 20 === 0 && <text x={M.left - 8} y={yOf(db) + 4} textAnchor="end" fontSize="11" fill={COLORS.muted}>{db}</text>}
            </g>
          ))}
          
          {FREQS.map((f, i) => (
            <g key={f}>
              <line x1={xOf(i)} x2={xOf(i)} y1={M.top} y2={H - M.bottom} stroke={COLORS.border} strokeWidth="1" />
              <text x={xOf(i)} y={M.top - 12} textAnchor="middle" fontSize="12" fill={COLORS.muted}>{f >= 1000 ? `${f / 1000}k` : f}</text>
            </g>
          ))}
          
          {/* تم إزالة النص القديم dB HL من هنا */}

          {/* --- 1. التسمية العمودية (Hearing thresholds in dB) --- */}
          <text 
            x={15} // المسافة من أقصى اليسار
            y={M.top + (plotH / 2)} // منتصف الارتفاع للمخطط
            transform={`rotate(-90 15 ${M.top + (plotH / 2)})`} // تدوير النص 90 درجة عكس عقارب الساعة
            textAnchor="middle" 
            fontSize="14" 
            fontWeight="bold" 
            fill={COLORS.muted}
          >
            Hearing thresholds in dB
          </text>

          {/* --- 2. التسمية الأفقية (Frequency in Hz) --- */}
          <text 
            x={M.left + (plotW / 2)} 
            y={H - 2} 
            textAnchor="middle" 
            fontSize="14" 
            fontWeight="bold" 
            fill={COLORS.muted}
          >
            Frequency in Hz
          </text>

          {SERIES.map((s) => {
            const points = FREQS.map((f, i) => ({ f, i, v: getVal(value, s, f) })).filter((p) => p.v !== null && p.v !== undefined);
            return (
              <g key={seriesKey(s)}>
                {s.type === 'air' && points.length > 1 && (
                  <polyline points={points.map((p) => `${xOf(p.i)},${yOf(p.v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="1.6" opacity="0.8" />
                )}
                {points.map((p) => <Mark key={p.f} s={s} x={xOf(p.i)} y={yOf(p.v)} masked={isMasked(value, s, p.f)} />)}
              </g>
            );
          })}
        </svg>
  );
}

// جدول القيم للقراءة فقط (الخلايا الفارغة تُعرض بشرطة)
export function AudiogramValuesTable({ value }) {
  return (
    <div  style={{ overflowX: 'auto' , direction:'ltr' }} dir='ltr'>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px', color: COLORS.muted }}>Frequency</th>
            {FREQS.map((f) => (
              <th key={f} style={{ padding: '6px', color: COLORS.muted }}>{f} Hz</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SERIES.map((s) => (
            <tr key={seriesKey(s)} style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <td style={{ padding: '6px', color: s.color, fontWeight: '700', whiteSpace: 'nowrap' }}>{s.symbol} {s.label}</td>
              {FREQS.map((f) => (
                <td key={f} style={{ padding: '6px', textAlign: 'center', color: COLORS.ink }}>
                  {getVal(value, s, f) ?? '—'}
                  {getVal(value, s, f) != null && isMasked(value, s, f) && <sup style={{ color: s.color, fontWeight: '800', marginRight: '2px' }}>M</sup>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== المحرّر: المخطط التفاعلي + جدول إدخال القيم =====
export function AudiogramEditor({ value, onChange }) {
  const [activeKey, setActiveKey] = useState('right-air');
  const [maskMode, setMaskMode] = useState(false); // false = غير مقنَّع (Unmasked)، true = مقنَّع (Masked)
  const current = value ?? EMPTY_AUDIOGRAM;

  // وضع قيمة مع حالة التقنيع (أو حذفها إن كانت null)
  const setPoint = (s, f, db, masked = false) => {
    const group = { ...(current[s.ear]?.[s.type] ?? {}) };
    const maskedGroup = { ...(current[s.ear]?.masked?.[s.type] ?? {}) };
    if (db === null || Number.isNaN(db)) {
      delete group[f];
      delete maskedGroup[f];
    } else {
      group[f] = db;
      if (masked) maskedGroup[f] = true;
      else delete maskedGroup[f];
    }
    onChange({
      ...current,
      [s.ear]: { ...current[s.ear], [s.type]: group, masked: { ...(current[s.ear]?.masked ?? {}), [s.type]: maskedGroup } },
    });
  };

  // النقر على نفس القيمة بنفس نوع التقنيع يحذفها؛ ونفس القيمة بنوع تقنيع مختلف يغيّر نوع الرمز فقط
  const handlePlot = (s, f, db, masked) => {
    const same = getVal(current, s, f) === db;
    setPoint(s, f, same && isMasked(current, s, f) === masked ? null : db, masked);
  };

  const summary = audiogramSummary(current);

  return (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '16px', maxWidth: '880px', margin: '0 auto' }}>      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', justifyContent: 'center' }}>
        {SERIES.map((s) => {
          const active = activeKey === seriesKey(s);
          return (
            <button
              key={seriesKey(s)}
              type="button"
              onClick={() => setActiveKey(seriesKey(s))}
              style={{
                padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                background: active ? COLORS.soft : 'transparent', color: COLORS.ink,
                border: active ? `2px solid ${s.color}` : `1px solid ${COLORS.border}`,
              }}
            >
              <span style={{ color: s.color, fontWeight: '800', marginLeft: '6px' }}>{s.symbol}</span>
              {s.label}
            </button>
          );
        })}
        <button type="button" onClick={() => onChange(EMPTY_AUDIOGRAM)} style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', background: 'transparent', color: COLORS.danger, border: `1px solid ${COLORS.border}` }}>
          <Eraser size={14} /> مسح الكل
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.muted }}>نوع العلامة:</span>
        {[{ masked: false, label: 'Unmasked' }, { masked: true, label: 'Masked' }].map((m) => {
          const active = maskMode === m.masked;
          const series = SERIES.find((x) => seriesKey(x) === activeKey);
          return (
            <button
              key={String(m.masked)}
              type="button"
              onClick={() => setMaskMode(m.masked)}
              aria-pressed={active}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                background: active ? COLORS.soft : 'transparent', color: COLORS.ink,
                border: active ? `2px solid ${series.color}` : `1px solid ${COLORS.border}`,
              }}
            >
              <svg width="20" height="20" viewBox="-11 -11 22 22" style={{ direction: 'ltr' }}><Mark s={series} x={0} y={0} masked={m.masked} /></svg>
              {m.label}
            </button>
          );
        })}
      </div>

      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: COLORS.muted }}>
        اختر الأذن ونوع التوصيل ونوع العلامة ثم انقر على المخطط لوضع النقطة (يُقرَّب لأقرب تردد و5 dB)، أو اكتب القيم في الجدول. النقر على نقطة موجودة بنفس القيمة يحذفها.
      </p>

      <Audiogram value={current} onPlot={handlePlot} activeKey={activeKey} masked={maskMode} />
      <AudiogramLegend />

      <div style={{ overflowX: 'auto', marginTop: '14px' }} dir='ltr'>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px', color: COLORS.muted }}>Frequency</th>
              {FREQS.map((f) => (
                <th key={f} style={{ padding: '6px', color: COLORS.muted }}>{f} Hz</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SERIES.map((s) => (
              <tr key={seriesKey(s)}>
                <td style={{ padding: '4px 6px', color: s.color, fontWeight: '700', whiteSpace: 'nowrap' }}>{s.symbol} / {symbolText(s, true)} {s.label}</td>
                {FREQS.map((f) => (
                  <td key={f} style={{ padding: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <input
                        type="number"
                        min={DB_MIN}
                        max={DB_MAX}
                        step="5"
                        className="warm-input"
                        style={{ margin: 0, padding: '6px', textAlign: 'center', minWidth: '58px' }}
                        value={getVal(current, s, f) ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const had = getVal(current, s, f) != null;
                          setPoint(s, f, raw === '' ? null : Math.min(DB_MAX, Math.max(DB_MIN, Number(raw))), had ? isMasked(current, s, f) : maskMode);
                        }}
                        aria-label={`${s.label} ${f}`}
                      />
                      {getVal(current, s, f) != null && (
                        <button
                          type="button"
                          title={isMasked(current, s, f) ? 'مقنَّع — اضغط لجعله غير مقنَّع' : 'غير مقنَّع — اضغط لجعله مقنَّعاً'}
                          aria-label={`${isMasked(current, s, f) ? 'مقنَّع' : 'غير مقنَّع'} ${s.label} ${f}`}
                          aria-pressed={isMasked(current, s, f)}
                          onClick={() => setPoint(s, f, getVal(current, s, f), !isMasked(current, s, f))}
                          style={{
                            padding: '2px 5px', fontSize: '10px', fontWeight: '800', borderRadius: '6px', cursor: 'pointer',
                            border: `1px solid ${isMasked(current, s, f) ? s.color : COLORS.border}`,
                            background: isMasked(current, s, f) ? s.color : 'transparent',
                            color: isMasked(current, s, f) ? '#fff' : COLORS.muted,
                          }}
                        >
                          M
                        </button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary && (() => {
        const worst = ['right', 'left']
          .map((ear) => pureToneAverage(current, ear))
          .filter((v) => v !== null)
          .sort((a, b) => b - a)[0];

        const colorClass =
          worst == null       ? 'audiogram-result--secondary' :
          worst <= 25         ? 'audiogram-result--success'   :
          worst <= 55         ? 'audiogram-result--warning'   :
          worst <= 90         ? 'audiogram-result--danger'    :
                                'audiogram-result--dark';

        return (
          <div className={`audiogram-result ${colorClass}`}>
            {summary}
          </div>
        );
      })()}
    </div>
  );
}
