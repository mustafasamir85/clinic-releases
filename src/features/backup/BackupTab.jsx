import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Cloud, Link2, Play, Save, Unlink } from 'lucide-react';
import * as api from '../../api';
import { COLORS, outlineGoldButtonStyle } from '../../styles';
import { CollapsibleSection, Panel, SectionHeader, TabCard } from '../../components/common/layout';
import StatusBadge from '../../components/common/StatusBadge';
import Field from '../../components/common/Field';

const box = { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '16px', marginBottom: '16px' };
const cell = { padding: '8px 12px', textAlign: 'right', borderBottom: `1px solid ${COLORS.border}`, fontSize: '13px' };
const formatSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// شاشة المدير: ربط Google Drive، وقت النسخ اليومي، عدد النسخ المحفوظة، نسخ فوري وسجل العمليات
export default function BackupTab({ onNotify }) {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ enabled: false, time: '02:00', keep: 30 });
  const [busy, setBusy] = useState(''); // '' | connect | save | run | disconnect
  const [error, setError] = useState('');

  const apply = useCallback((s) => {
    setStatus(s);
    setForm({ enabled: s.enabled, time: s.time, keep: s.keep });
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await api.getBackupStatus());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [apply]);

  useEffect(() => {
    load();
  }, [load]);

  // أثناء الربط نسأل الخادم دورياً هل أكمل المستخدم الموافقة في صفحة Google
  const pending = status?.pending;
  useEffect(() => {
    if (!pending) return undefined;
    const timer = setInterval(async () => {
      try {
        const res = await api.pollBackupConnect();
        if (res.status === 'connected') {
          onNotify?.('تم ربط Google Drive بنجاح.');
          load();
        }
      } catch (e) {
        setError(e.message);
        load();
      }
    }, Math.max(pending.interval || 5, 3) * 1000);
    return () => clearInterval(timer);
  }, [pending, load, onNotify]);

  const run = async (kind, fn, doneText, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(kind);
    setError('');
    try {
      const res = await fn();
      if (res?.history) apply(res);
      else await load();
      if (doneText) onNotify?.(doneText);
    } catch (e) {
      setError(e.message);
      load();
    } finally {
      setBusy('');
    }
  };

  const dirty = status && (form.enabled !== status.enabled || form.time !== status.time || Number(form.keep) !== status.keep);

  return (
    <TabCard maxWidth={900}>
      <SectionHeader title="النسخ الاحتياطي" description="نسخة يومية تلقائية من قاعدة البيانات تُرفع إلى Google Drive" icon={Cloud} />

      {error && (
        <div role="alert" style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', background: COLORS.dangerBg, color: COLORS.dangerText, fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}

      {!status ? (
        <p style={{ color: COLORS.faint }}>{error ? '' : 'جارٍ التحميل...'}</p>
      ) : !status.configured ? (
        <div style={box}>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 2 }}>
            لتفعيل النسخ إلى Google Drive اضبط متغيّري البيئة <code dir="ltr">CLINIC_GOOGLE_CLIENT_ID</code> و <code dir="ltr">CLINIC_GOOGLE_CLIENT_SECRET</code> في إعدادات الاستضافة ثم أعد تشغيل الخادم مرة واحدة. الخطوات في ملف <code dir="ltr">BACKUP.md</code>.
          </p>
        </div>
      ) : (
        <>
          <Panel title="حساب Google Drive" style={box}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {status.connected ? (
                <StatusBadge tone="success"><CheckCircle2 size={12} style={{ verticalAlign: '-2px' }} /> مربوط{status.connected_at ? ` منذ ${status.connected_at}` : ''}</StatusBadge>
              ) : (
                <StatusBadge tone="warning">غير مربوط</StatusBadge>
              )}
              {status.connected ? (
                <button type="button" disabled={Boolean(busy)} onClick={() => run('disconnect', api.disconnectBackup, 'تم إلغاء الربط.', 'إلغاء ربط Google Drive؟ ستتوقف النسخ التلقائية. النسخ المرفوعة سابقاً تبقى في Drive.')} style={outlineGoldButtonStyle}>
                  <Unlink size={14} color={COLORS.gold} /> إلغاء الربط
                </button>
              ) : (
                <button type="button" className="btn-warm-primary" disabled={Boolean(busy) || Boolean(pending)} onClick={() => run('connect', api.startBackupConnect, '', '')}>
                  <Link2 size={16} /> ربط حساب Google Drive
                </button>
              )}
            </div>

            {pending && (
              <div style={{ marginTop: '14px', padding: '14px', borderRadius: '12px', background: COLORS.soft, fontSize: '13px', lineHeight: 2 }}>
                <div>١. افتح الرابط: <a href={pending.verification_url} target="_blank" rel="noreferrer" dir="ltr" style={{ color: COLORS.link, fontWeight: '800' }}>{pending.verification_url}</a></div>
                <div>٢. أدخل هذا الرمز:</div>
                <strong dir="ltr" style={{ display: 'block', fontSize: '26px', letterSpacing: '3px', color: COLORS.ink, margin: '4px 0' }}>{pending.user_code}</strong>
                <div>٣. سجّل الدخول بحساب Google المطلوب ووافق على الصلاحية. ستكتمل العملية هنا تلقائياً.</div>
              </div>
            )}
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: COLORS.muted }}>
              يصل التطبيق فقط إلى الملفات التي ينشئها بنفسه (مجلد «نسخ العيادة الاحتياطية»)، ولا يرى بقية ملفات Drive.
            </p>
          </Panel>

          <Panel title="الجدولة" style={box}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '14px', marginBottom: '14px', cursor: status.connected ? 'pointer' : 'default' }}>
              <input type="checkbox" checked={form.enabled} disabled={!status.connected} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
              تفعيل النسخ الاحتياطي اليومي
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <Field label={`وقت النسخ اليومي (بتوقيت ${status.timezone})`}>
                <input type="time" className="warm-input" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} required />
              </Field>
              <Field label="عدد النسخ المحفوظة في Drive">
                <input type="number" min="1" max="365" className="warm-input" value={form.keep} onChange={(e) => setForm((f) => ({ ...f, keep: e.target.value }))} />
              </Field>
            </div>
            <p style={{ margin: '4px 0 12px', fontSize: '12px', color: COLORS.muted }}>
              الوقت الحالي في الخادم: <span dir="ltr">{status.now}</span>
              {status.next_run && <> • النسخة القادمة: <strong dir="ltr">{status.next_run}</strong></>}
              . تُحذف النسخ الأقدم تلقائياً عند تجاوز العدد. إن فشلت النسخة تُعاد المحاولة كل نصف ساعة.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-warm-primary" disabled={!dirty || Boolean(busy)} onClick={() => run('save', () => api.saveBackupSettings({ enabled: form.enabled, time: form.time, keep: Number(form.keep) }), 'تم حفظ إعدادات النسخ الاحتياطي.')}>
                <Save size={16} /> {busy === 'save' ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
              </button>
              <button type="button" disabled={!status.connected || Boolean(busy)} onClick={() => run('run', api.runBackupNow, 'تم رفع النسخة الاحتياطية إلى Google Drive.')} style={outlineGoldButtonStyle}>
                <Play size={14} color={COLORS.gold} /> {busy === 'run' ? 'جارٍ النسخ والرفع...' : 'نسخ احتياطي الآن'}
              </button>
            </div>
          </Panel>

          {status.history.length > 0 && (
            <CollapsibleSection header={<h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: '800' }}>سجل النسخ</h4>}>
              <div className="table-scroll" style={{ border: `1px solid ${COLORS.border}`, borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: COLORS.card, minWidth: '520px' }}>
                  <thead>
                    <tr style={{ background: COLORS.soft }}>
                      {['الوقت', 'النوع', 'الملف', 'الحجم', 'النتيجة'].map((h) => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontSize: '13px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {status.history.map((h, i) => (
                      <tr key={i}>
                        <td style={cell} dir="ltr">{h.time}</td>
                        <td style={cell}>{h.trigger === 'auto' ? 'تلقائي' : 'يدوي'}</td>
                        <td style={cell} dir="ltr">{h.file || '—'}</td>
                        <td style={cell}>{h.ok ? formatSize(h.size) : '—'}</td>
                        <td style={{ ...cell, color: h.ok ? COLORS.successText : COLORS.danger }}>{h.ok ? (h.message ? `تم (${h.message})` : 'تم') : h.message || 'فشل'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}
        </>
      )}
    </TabCard>
  );
}
