import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Palette, RotateCcw, TriangleAlert } from 'lucide-react';
import { DEFAULT_DISPLAY, FONT_SIZES, supportsZoom } from '../../hooks/useDisplayPrefs';
import { contrastReport, HEX, resolveTheme, THEMES, TOKEN_GROUPS } from '../../utils/themes';

// أزرار اختيار واحد من عدّة خيارات (radiogroup): تُستعمل لوضع الألوان وحجم الخط وكثافة العرض
function Segmented({ label, options, value, onPick }) {
  return (
    <div className="theme-colors-group">
      <div className="theme-colors-label">{label}</div>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={`seg-btn ${value === o.id ? 'selected' : ''}`} onClick={() => onPick(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const MODE_OPTIONS = [
  { id: 'system', label: 'تلقائي' },
  { id: 'light', label: 'فاتح' },
  { id: 'dark', label: 'داكن' },
];
const DENSITY_OPTIONS = [
  { id: 'comfortable', label: 'مريح' },
  { id: 'compact', label: 'مضغوط' },
];
const TABS = [
  { id: 'themes', label: 'الثيمات' },
  { id: 'custom', label: 'تخصيص الألوان' },
  { id: 'display', label: 'العرض' },
];

// معاينة مصغّرة لثيم: ترويسة + بطاقة بسطرَي نص + زر بتدرّج الأزرار، بألوان الوضع الحالي
function ThemeCard({ family, mode, selected, onPick }) {
  const t = useMemo(() => resolveTheme(family.id, mode).tokens, [family.id, mode]);
  return (
    <button type="button" className={`theme-preset ${selected ? 'selected' : ''}`} aria-pressed={selected} title={family.name} onClick={onPick}>
      <span className="theme-preset-preview" style={{ background: t.bg, borderColor: t.border }}>
        <span className="theme-preset-bar" style={{ background: t.surface, borderColor: t.border }}>
          <span style={{ background: t.accent }} />
          <span style={{ background: t.border }} />
        </span>
        <span className="theme-preset-card" style={{ background: t.card, borderColor: t.border }}>
          <span className="theme-preset-line" style={{ background: t.ink, width: '62%' }} />
          <span className="theme-preset-line" style={{ background: t.muted, width: '40%' }} />
          <span className="theme-preset-btn" style={{ background: `linear-gradient(135deg, ${t.btn1}, ${t.btn2})` }} />
        </span>
        {selected && <span className="theme-preset-check" style={{ background: t.btn1, color: t.onBtn }}><Check size={12} strokeWidth={3} /></span>}
      </span>
      <span className="theme-preset-name">{family.name}</span>
    </button>
  );
}

// صفّ لون واحد: منتقي لون + حقل hex + زر إعادة + تحذير تباين
function TokenRow({ token, tokens, overridden, onChange }) {
  const value = tokens[token.key];
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const report = contrastReport(tokens, token.key);

  const commitDraft = (text) => {
    const v = text.startsWith('#') ? text : `#${text}`;
    setDraft(text);
    if (HEX.test(v)) onChange(v);
  };

  return (
    <div className={`token-row ${overridden ? 'overridden' : ''}`}>
      <label className="token-swatch" style={{ background: value }} title="اختر لوناً">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${token.label}: اختيار اللون`} />
      </label>
      <div className="token-info">
        <span className="token-label">{token.label}</span>
        {token.hint && <span className="token-hint">{token.hint}</span>}
      </div>
      {report && !report.ok && (
        <span className="token-warn" title={`تباين ضعيف (${report.ratio.toFixed(1)}:1) — المطلوب ${report.min}:1 على الأقل لتبقى القراءة مريحة`}>
          <TriangleAlert size={13} /> {report.ratio.toFixed(1)}
        </span>
      )}
      <input
        className="token-hex"
        dir="ltr"
        spellCheck={false}
        maxLength={7}
        value={draft}
        onChange={(e) => commitDraft(e.target.value.trim())}
        onBlur={() => setDraft(value)}
        aria-label={`${token.label}: قيمة اللون`}
      />
      <button type="button" className="token-reset" disabled={!overridden} onClick={() => onChange(null)} title="إعادة لون الثيم" aria-label={`إعادة ${token.label} إلى لون الثيم`}>
        <RotateCcw size={13} />
      </button>
    </div>
  );
}

// تبويب التخصيص: كل ألوان التصميم مجمّعة، مع تصدير الثيم واستيراده
function CustomTab({ ctl }) {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null); // { ok, text }
  const count = Object.keys(ctl.overrides).length;
  const modeName = ctl.theme === 'dark' ? 'الداكن' : 'الفاتح';

  const copy = async () => {
    const json = ctl.exportTheme();
    setText(json);
    try {
      await navigator.clipboard.writeText(json);
      setMsg({ ok: true, text: 'تم نسخ الثيم إلى الحافظة.' });
    } catch {
      setMsg({ ok: true, text: 'النص جاهز في المربع أدناه — انسخه يدوياً.' });
    }
  };
  const apply = () => {
    const r = ctl.importTheme(text);
    setMsg({ ok: r.ok, text: r.ok ? 'تم تطبيق الثيم.' : r.error });
  };

  return (
    <div className="theme-tab">
      <p className="theme-colors-note">
        تعدّل الآن ألوان الوضع <b>{modeName}</b> من ثيم «{ctl.themeName}». تعديلات الوضع الفاتح والداكن منفصلة، وتُحفظ في هذا المتصفح.
      </p>
      <button type="button" className="theme-colors-reset" disabled={!count} onClick={ctl.resetTokens}>
        <RotateCcw size={14} /> إعادة ألوان الثيم{count ? ` (${count} معدّل)` : ''}
      </button>

      {TOKEN_GROUPS.map((g) => (
        <details key={g.id} className="token-group" open={g.id === 'base'}>
          <summary>
            {g.label}
            {g.tokens.some((t) => t.key in ctl.overrides) && <span className="token-group-dot" aria-label="يحتوي تعديلات" />}
          </summary>
          {g.note && <p className="theme-colors-note">{g.note}</p>}
          {g.tokens.map((t) => (
            <TokenRow key={t.key} token={t} tokens={ctl.tokens} overridden={t.key in ctl.overrides} onChange={(v) => ctl.setToken(t.key, v)} />
          ))}
        </details>
      ))}

      <details className="token-group">
        <summary>تصدير / استيراد الثيم</summary>
        <p className="theme-colors-note">انسخ ثيمك لنقله إلى جهاز آخر أو مشاركته، أو الصق نصاً سبق تصديره ثم اضغط «تطبيق».</p>
        <textarea className="token-export" dir="ltr" rows={5} value={text} onChange={(e) => { setText(e.target.value); setMsg(null); }} placeholder='{ "v": 1, "theme": "aurora", ... }' aria-label="نص الثيم" />
        <div className="token-export-actions">
          <button type="button" className="theme-colors-reset" onClick={copy}><Copy size={14} /> نسخ ثيمي</button>
          <button type="button" className="theme-colors-reset" disabled={!text.trim()} onClick={apply}><Download size={14} /> تطبيق</button>
        </div>
        {msg && <p className={`theme-colors-note ${msg.ok ? '' : 'theme-colors-error'}`} role="status">{msg.text}</p>}
      </details>
    </div>
  );
}

// زر المظهر في الترويسة: يفتح لوحة بثلاثة تبويبات (ثيمات جاهزة / تخصيص كل الألوان / حجم الخط والكثافة)
export default function ThemeColors({ ctl, display, onDisplayChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('themes');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const canZoom = supportsZoom();
  const displayChanged = display && (display.font !== DEFAULT_DISPLAY.font || display.compact);

  return (
    <div className="theme-colors" ref={ref}>
      <button type="button" className="btn-icon-theme" aria-label="المظهر والعرض" aria-expanded={open} title="المظهر والعرض" onClick={() => setOpen((o) => !o)}>
        <Palette size={18} />
      </button>
      {open && (
        <div className="theme-colors-panel" role="dialog" aria-label="المظهر والعرض">
          <div className="theme-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`theme-tab-btn ${tab === t.id ? 'selected' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="theme-panel-body">
            {tab === 'themes' && (
              <div className="theme-tab">
                <Segmented label="وضع الألوان" options={MODE_OPTIONS} value={ctl.mode} onPick={ctl.setMode} />
                {ctl.mode === 'system' && <p className="theme-colors-note" style={{ marginTop: '-6px' }}>يتبع إعداد جهازك (فاتح/داكن) ويتغيّر معه تلقائياً.</p>}
                <div className="theme-colors-group">
                  <div className="theme-colors-label">الثيمات</div>
                  <div className="theme-presets">
                    {THEMES.map((f) => (
                      <ThemeCard key={f.id} family={f} mode={ctl.theme} selected={ctl.themeId === f.id} onPick={() => ctl.setThemeId(f.id)} />
                    ))}
                  </div>
                </div>
                <p className="theme-colors-note">لكل ثيم نسخة فاتحة وداكنة. اختيار ثيم جديد يستبدل أي تخصيص سابق — صدّر ثيمك أولاً من تبويب «تخصيص الألوان» إن أردت الاحتفاظ به.</p>
              </div>
            )}

            {tab === 'custom' && <CustomTab ctl={ctl} />}

            {tab === 'display' && (
              <div className="theme-tab">
                {onDisplayChange && canZoom && <Segmented label="حجم الخط" options={FONT_SIZES} value={display.font} onPick={(font) => onDisplayChange({ font })} />}
                {onDisplayChange && (
                  <Segmented label="كثافة العرض" options={DENSITY_OPTIONS} value={display.compact ? 'compact' : 'comfortable'} onPick={(id) => onDisplayChange({ compact: id === 'compact' })} />
                )}
                {onDisplayChange && (
                  <button type="button" className="theme-colors-reset" disabled={!displayChanged} onClick={() => onDisplayChange()}>
                    <RotateCcw size={14} /> استعادة حجم الخط والكثافة
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
