import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, RefreshCw, RotateCcw } from 'lucide-react';
import * as api from '../../api';
import { COLORS, outlineGoldButtonStyle } from '../../styles';
import { CollapsibleSection, Panel, SectionHeader, TabCard } from '../../components/common/layout';
import StatusBadge from '../../components/common/StatusBadge';

const box = { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '16px', marginBottom: '16px' };

// شاشة المدير: الإصدار الحالي، فحص الجديد، تثبيته بضغطة، والرجوع للنسخة السابقة
export default function UpdatesTab({ onNotify }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(''); // '' | check | apply | rollback
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setStatus(await api.getUpdateStatus());
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (kind, fn, confirmText, doneText, reload) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(kind);
    setError('');
    try {
      setStatus(await fn());
      onNotify?.(doneText);
      if (reload) setTimeout(() => window.location.reload(), 1500); // لتحميل الواجهة الجديدة
    } catch (e) {
      setError(e.message);
      load();
    } finally {
      setBusy('');
    }
  };

  const latest = status?.latest;

  return (
    <TabCard maxWidth={900}>
      <SectionHeader title="تحديثات التطبيق" description="تثبيت الإصدارات الجديدة من الإنترنت دون إعادة نشر يدوية" icon={RefreshCw} />

      {error && (
        <div role="alert" style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', background: COLORS.dangerBg, color: COLORS.dangerText, fontSize: '13px', fontWeight: '700' }}>
          {error}
        </div>
      )}

      {!status ? (
        <p style={{ color: COLORS.faint }}>{error ? '' : 'جارٍ التحميل...'}</p>
      ) : (
        <>
          <Panel title="حالة الإصدار" style={box}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: COLORS.muted }}>الإصدار المثبّت</span>
                <strong style={{ display: 'block', fontSize: '22px', color: COLORS.ink }} dir="ltr">{status.current_version}</strong>
              </div>
              {!status.configured ? (
                <StatusBadge tone="warning">رابط التحديث غير مضبوط</StatusBadge>
              ) : status.available ? (
                <StatusBadge tone="warning">يتوفر إصدار أحدث: {latest.version}</StatusBadge>
              ) : (
                <StatusBadge tone="success"><CheckCircle2 size={12} style={{ verticalAlign: '-2px' }} /> التطبيق محدّث</StatusBadge>
              )}
            </div>
            {status.last_check && <p style={{ margin: '10px 0 0', fontSize: '12px', color: COLORS.muted }}>آخر فحص: {status.last_check}</p>}
          </Panel>

          {!status.configured && (
            <div style={box}>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.9 }}>
                لتفعيل التحديث الأونلاين اضبط متغير البيئة <code dir="ltr">CLINIC_UPDATE_URL</code> على رابط ملف <code dir="ltr">manifest.json</code> في إعدادات الاستضافة ثم أعد تشغيل الخادم مرة واحدة. الخطوات في ملف <code dir="ltr">backend/UPDATES.md</code>.
              </p>
            </div>
          )}

          {status.available && latest && (
            <div style={{ ...box, borderColor: COLORS.gold }}>
              <strong style={{ color: COLORS.ink }}>الإصدار {latest.version}</strong>
              {latest.notes && <p style={{ margin: '8px 0 0', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{latest.notes}</p>}
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: COLORS.muted }}>
                يُحفظ الإصدار الحالي كنسخة احتياطية ويمكن الرجوع إليه. بيانات العيادة لا تتأثر.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" disabled={!status.configured || Boolean(busy)} onClick={() => run('check', api.checkUpdate, '', 'تم فحص التحديثات.')} style={outlineGoldButtonStyle}>
              <RefreshCw size={14} color={COLORS.gold} className={busy === 'check' ? 'animate-spin' : ''} /> فحص التحديثات الآن
            </button>
            <button
              type="button"
              className="btn-warm-primary"
              disabled={!status.available || Boolean(busy)}
              onClick={() => run('apply', api.applyUpdate, `تثبيت الإصدار ${latest?.version}؟ ستُعاد الصفحة تلقائياً بعد التثبيت، وعلى بقية المستخدمين تحديث صفحاتهم.`, 'تم تثبيت التحديث. جارٍ إعادة التحميل...', true)}
            >
              <Download size={16} /> {busy === 'apply' ? 'جارٍ التثبيت...' : 'تحديث الآن'}
            </button>
            <button
              type="button"
              disabled={!status.can_rollback || Boolean(busy)}
              onClick={() => run('rollback', api.rollbackUpdate, 'الرجوع إلى النسخة السابقة؟', 'تم الرجوع للنسخة السابقة. جارٍ إعادة التحميل...', true)}
              style={outlineGoldButtonStyle}
            >
              <RotateCcw size={14} color={COLORS.gold} /> رجوع للنسخة السابقة
            </button>
          </div>

          {status.history.length > 0 && (
            <CollapsibleSection style={{ marginTop: '24px' }} header={<h4 style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: '800' }}>سجل التحديثات</h4>}>
              <div className="table-scroll" style={{ border: `1px solid ${COLORS.border}`, borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: COLORS.card, minWidth: '460px' }}>
                  <thead>
                    <tr style={{ background: COLORS.soft }}>
                      {['الوقت', 'العملية', 'من', 'إلى', 'النتيجة'].map((h) => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontSize: '13px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {status.history.map((h, i) => (
                      <tr key={i}>
                        <td style={cell} dir="ltr">{h.time}</td>
                        <td style={cell}>{h.action === 'rollback' ? 'رجوع' : 'تحديث'}</td>
                        <td style={cell} dir="ltr">{h.from}</td>
                        <td style={cell} dir="ltr">{h.to}</td>
                        <td style={{ ...cell, color: h.ok ? COLORS.successText : COLORS.danger }}>{h.ok ? 'تم' : h.message || 'فشل'}</td>
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

const cell = { padding: '8px 12px', textAlign: 'right', borderBottom: `1px solid ${COLORS.border}`, fontSize: '13px' };
