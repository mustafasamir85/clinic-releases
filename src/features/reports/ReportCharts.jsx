import { formatDateDMY, formatMoney } from '../../utils/format';

const hasValue = (n) => Number(n) > 0;
const num = (n) => Number(n) || 0;

const chartDateLabel = (key) => {
  if (!key) return '';
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [year, month] = key.split('-');
    return `${month}/${year}`;
  }
  return formatDateDMY(key);
};

const compactMoney = (amount) => {
  const value = num(amount);
  if (Math.abs(value) >= 1000) {
    const thousands = value / 1000;
    return `${thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10} ألف د.أ`;
  }
  return formatMoney(value);
};

function ChartCard({ title, wide, children }) {
  return (
    <section className={`report-chart-card${wide ? ' report-chart-wide' : ''}`}>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

export function ChartGrid({ children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (items.length === 0) return null;
  return <div className="report-charts">{items}</div>;
}

export function CompareBars({ title, items }) {
  const rows = items.filter((item) => Number.isFinite(num(item.value)));
  const max = Math.max(0, ...rows.map((item) => Math.abs(num(item.value))));
  if (max <= 0) return null;
  return (
    <ChartCard title={title}>
      <div className="vbar-chart" role="img" aria-label={title}>
        {rows.map((item) => {
          const value = num(item.value);
          const pct = value === 0 ? 0 : Math.max(4, Math.round((Math.abs(value) / max) * 100));
          return (
            <div key={item.label} className="vbar-col">
              <span className="vbar-value">{item.format ? item.format(value) : compactMoney(value)}</span>
              <div className="vbar-track">
                <div className={`vbar-fill${value < 0 ? ' is-negative' : ''}`} style={{ height: `${pct}%`, background: item.color || 'var(--c-accent)' }} />
              </div>
              <span className="vbar-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

export function HorizontalBars({ title, rows, valueKey = 'value', labelKey = 'key', formatValue, limit = 8 }) {
  const list = rows.filter((row) => hasValue(row[valueKey])).slice(0, limit);
  const max = Math.max(0, ...list.map((row) => num(row[valueKey])));
  if (max <= 0) return null;
  return (
    <ChartCard title={title}>
      <ul className="hbar-chart" aria-label={title}>
        {list.map((row) => {
          const value = num(row[valueKey]);
          const pct = Math.max(6, Math.round((value / max) * 100));
          return (
            <li key={row[labelKey]} className="hbar-row">
              <span className="hbar-label" title={row[labelKey]}>{row[labelKey]}</span>
              <div className="hbar-track">
                <div className="hbar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="hbar-value">{formatValue ? formatValue(row) : value}</span>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}

export function ShareDonut({ title, slices }) {
  const list = slices.filter((slice) => hasValue(slice.value));
  const total = list.reduce((sum, slice) => sum + num(slice.value), 0);
  if (total <= 0 || list.length < 2) return null;

  const r = 42;
  const c = 2 * Math.PI * r;
  const arcs = list.map((slice, index) => {
    const len = (num(slice.value) / total) * c;
    const offset = list.slice(0, index).reduce((sum, item) => sum + (num(item.value) / total) * c, 0);
    return { ...slice, dash: `${len} ${c - len}`, offset };
  });

  return (
    <ChartCard title={title}>
      <div className="donut-chart">
        <svg viewBox="0 0 120 120" width="150" height="150" role="img" aria-label={title}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--c-soft)" strokeWidth="16" />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth="16"
              strokeDasharray={arc.dash}
              strokeDashoffset={-arc.offset}
              transform="rotate(-90 60 60)"
            />
          ))}
          <text x="60" y="56" textAnchor="middle" className="donut-total">{compactMoney(total).replace(' د.أ', '')}</text>
          <text x="60" y="72" textAnchor="middle" className="donut-unit">د.أ</text>
        </svg>
        <ul className="donut-legend">
          {list.map((slice) => (
            <li key={slice.label}>
              <span className="donut-swatch" style={{ background: slice.color }} />
              <span>{slice.label}</span>
              <strong>{formatMoney(slice.value)} ({Math.round((num(slice.value) / total) * 100)}%)</strong>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

export function TrendLines({ title, points, series }) {
  const active = series.filter((s) => points.some((p) => hasValue(p[s.key])));
  if (points.length < 2 || active.length === 0) return null;

  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 36, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.flatMap((p) => active.map((s) => num(p[s.key]))));
  const x = (i) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v) => pad.top + innerH - (num(v) / max) * innerH;
  const ticks = [0, 0.5, 1].map((t) => max * t);
  const step = points.length > 10 ? Math.ceil(points.length / 8) : 1;

  return (
    <ChartCard title={title} wide>
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="trend-grid" />
            <text x={pad.left - 8} y={y(tick) + 4} className="trend-axis" textAnchor="end">
              {max >= 1000 ? `${Math.round((tick / 1000) * 10) / 10} ألف` : Math.round(tick)}
            </text>
          </g>
        ))}
        {active.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={s.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points.map((p, i) => `${x(i)},${y(p[s.key])}`).join(' ')}
          />
        ))}
        {points.map((p, i) => (
          step === 1 || i % step === 0 || i === points.length - 1 ? (
            <text key={p.key} x={x(i)} y={height - 10} className="trend-axis" textAnchor="middle">
              {chartDateLabel(p.key)}
            </text>
          ) : null
        ))}
      </svg>
      <ul className="trend-legend">
        {active.map((s) => (
          <li key={s.key}><span style={{ background: s.color }} />{s.label}</li>
        ))}
      </ul>
    </ChartCard>
  );
}
