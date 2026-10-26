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
  { ear: 'right', type: 'air', label: 'اليمنى — هوائي', color: RIGHT, symbol: 'O' },
  { ear: 'left', type: 'air', label: 'اليسرى — هوائي', color: LEFT, symbol: 'X' },
  { ear: 'right', type: 'bone', label: 'اليمنى — عظمي', color: RIGHT, symbol: '<' },
  { ear: 'left', type: 'bone', label: 'اليسرى — عظمي', color: LEFT, symbol: '>' },
];
const seriesKey = (s) => `${s.ear}-${s.type}`;
const EAR_NAME = { right: 'الأذن اليمنى', left: 'الأذن اليسرى' };

const getVal = (a, s, f) => a?.[s.ear]?.[s.type]?.[f];

export const hasAudiogram = (a) =>
  SERIES.some((s) => Object.values(a?.[s.ear]?.[s.type] ?? {}).some((v) => v !== null && v !== undefined));

// تصنيف درجة الفقد السمعي (dB HL) حسب متوسط 500/1000/2000
export const classifyLoss = (db) =>
  db <= 25 ? 'سمع طبيعي' : db <= 40 ? 'ضعف خفيف' : db <= 55 ? 'ضعف متوسط' : db <= 70 ? 'ضعف متوسط إلى شديد' : db <= 90 ? 'ضعف شديد' : 'ضعف عميق';

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
      return avg === null ? null : `${EAR_NAME[ear]}: متوسط ${avg} dB — ${classifyLoss(avg)}`;
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

function Mark({ s, x, y }) {
  const p = { stroke: s.color, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (s.symbol === 'O') return <circle cx={x} cy={y} r="7" {...p} />;
  if (s.symbol === 'X') return <path d={`M${x - 6} ${y - 6}L${x + 6} ${y + 6}M${x + 6} ${y - 6}L${x - 6} ${y + 6}`} {...p} />;
  if (s.symbol === '<') return <path d={`M${x + 5} ${y - 7}L${x - 5} ${y}L${x + 5} ${y + 7}`} {...p} />;
  return <path d={`M${x - 5} ${y - 7}L${x + 5} ${y}L${x - 5} ${y + 7}`} {...p} />;
}

// مخطط التخطيط. إن مُرّرت onPlot(series, freq, db) يصبح النقر على المخطط يضع النقطة.
export function Audiogram({ value, onPlot, activeKey }) {
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
    onPlot(SERIES.find((s) => seriesKey(s) === activeKey), FREQS[idx], db);
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: W, height: 'auto', display: 'block', cursor: onPlot ? 'crosshair' : 'default', background: COLORS.white, borderRadius: '12px', border: `1px solid ${COLORS.border}`, direction: 'ltr' }}
      onClick={handleClick}
      role="img"
      aria-label="مخطط تخطيط السمع"
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
      <text x={M.left - 40} y={M.top - 12} fontSize="10" fill={COLORS.faint}>dB HL</text>

      {SERIES.map((s) => {
        const points = FREQS.map((f, i) => ({ f, i, v: getVal(value, s, f) })).filter((p) => p.v !== null && p.v !== undefined);
        return (
          <g key={seriesKey(s)}>
            {s.type === 'air' && points.length > 1 && (
              <polyline points={points.map((p) => `${xOf(p.i)},${yOf(p.v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="1.6" opacity="0.8" />
            )}
            {points.map((p) => <Mark key={p.f} s={s} x={xOf(p.i)} y={yOf(p.v)} />)}
          </g>
        );
      })}
    </svg>
  );
}

// جدول القيم للقراءة فقط (الخلايا الفارغة تُعرض بشرطة)
export function AudiogramValuesTable({ value }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'right', padding: '6px', color: COLORS.muted }}>التوصيل</th>
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
                <td key={f} style={{ padding: '6px', textAlign: 'center', color: COLORS.ink }}>{getVal(value, s, f) ?? '—'}</td>
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
  const current = value ?? EMPTY_AUDIOGRAM;

  // وضع قيمة (أو حذفها إن كانت null)
  const setPoint = (s, f, db) => {
    const group = { ...(current[s.ear]?.[s.type] ?? {}) };
    if (db === null || Number.isNaN(db)) delete group[f];
    else group[f] = db;
    onChange({ ...current, [s.ear]: { ...current[s.ear], [s.type]: group } });
  };

  // النقر على نفس القيمة الموجودة يحذفها (للتصحيح السريع)
  const handlePlot = (s, f, db) => setPoint(s, f, getVal(current, s, f) === db ? null : db);

  const summary = audiogramSummary(current);

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
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

      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: COLORS.muted }}>
        اختر الأذن ونوع التوصيل ثم انقر على المخطط لوضع النقطة (يُقرَّب لأقرب تردد و5 dB)، أو اكتب القيم في الجدول. النقر على نقطة موجودة بنفس القيمة يحذفها.
      </p>

      <Audiogram value={current} onPlot={handlePlot} activeKey={activeKey} />

      <div style={{ overflowX: 'auto', marginTop: '14px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right', padding: '6px', color: COLORS.muted }}>التوصيل</th>
              {FREQS.map((f) => (
                <th key={f} style={{ padding: '6px', color: COLORS.muted }}>{f} Hz</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SERIES.map((s) => (
              <tr key={seriesKey(s)}>
                <td style={{ padding: '4px 6px', color: s.color, fontWeight: '700', whiteSpace: 'nowrap' }}>{s.symbol} {s.label}</td>
                {FREQS.map((f) => (
                  <td key={f} style={{ padding: '3px' }}>
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
                        setPoint(s, f, raw === '' ? null : Math.min(DB_MAX, Math.max(DB_MIN, Number(raw))));
                      }}
                      aria-label={`${s.label} ${f}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary && (
        <p style={{ margin: '12px 0 0 0', fontSize: '13px', fontWeight: '700', color: COLORS.ink }}>{summary}</p>
      )}
    </div>
  );
}
