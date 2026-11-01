import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Image as ImageIcon, Loader2, Megaphone, RefreshCw, Send, Trash2, X } from 'lucide-react';
import * as api from '../../api';
import { COLORS, smallOutlineButtonStyle } from '../../styles';
import { Panel, SectionHeader, TabCard } from '../../components/common/layout';
import Field from '../../components/common/Field';
import StatusBadge from '../../components/common/StatusBadge';
import ShowMore from '../../components/common/ShowMore';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useShowMore } from '../../hooks/useShowMore';
import { formatWhen } from '../../components/common/AnnouncementPopup';
import AnnouncementImage from '../../components/common/AnnouncementImage';
import { prepareImage } from './prepareImage';
import { ACCEPTED_TYPES, formatBytes } from './imageUtils';
import {
  ANNOUNCEMENT_LEVELS,
  EXPIRY_OPTIONS,
  MAX_MESSAGE,
  MAX_TITLE,
  announcementStatus,
  expiresAtFrom,
  validateAnnouncement,
} from './announcementUtils';

const PAGE_SIZE = 10;
const REFRESH_MS = 30000; // تحديث أعداد من اطّلع تلقائياً
const EMPTY_FORM = { title: '', message: '', level: 'info', expiry: '7d' };
const STATUS_VIEW = {
  active: { tone: 'success', label: 'نشطة' },
  expired: { tone: 'neutral', label: 'منتهية' },
  revoked: { tone: 'danger', label: 'ملغاة' },
};

// شاشة المدير: إرسال رسالة تظهر كنافذة منبثقة لجميع المستخدمين (فور فتحهم التطبيق، أو خلال نحو 30 ثانية إن كانوا فاتحين)
export default function AnnouncementsTab({ onNotify }) {
  const confirm = useConfirm();
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState(null); // null = لم يُحمَّل بعد
  const [loadError, setLoadError] = useState(null); // { message, unsupported }
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [image, setImage] = useState(null); // { base64, previewUrl, width, height, bytes }
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const [openImages, setOpenImages] = useState(() => new Set()); // رسائل السجل التي فُتحت صورتها
  const fileInput = useRef(null);
  const pager = useShowMore(items?.length ?? 0, PAGE_SIZE);

  const load = useCallback(async () => {
    try {
      const res = await api.getAnnouncements();
      setItems(Array.isArray(res?.items) ? res.items : []);
      setLoadError(null);
    } catch (error) {
      setLoadError({ message: error.message, status: error.status, unsupported: [404, 405, 501].includes(error.status) });
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => !document.hidden && load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // نحرّر رابط المعاينة المؤقت عند استبدال الصورة أو إزالتها أو إغلاق الشاشة
  useEffect(() => () => image && URL.revokeObjectURL(image.previewUrl), [image]);

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // ليُتاح اختيار الملف نفسه مرة أخرى
    if (!file) return;
    setImageBusy(true);
    setImageError('');
    try {
      setImage(await prepareImage(file));
    } catch (error) {
      setImageError(error.message);
    } finally {
      setImageBusy(false);
    }
  };

  const toggleImage = (id) =>
    setOpenImages((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const handleSend = async () => {
    const problem = validateAnnouncement(form);
    setFormError(problem ?? '');
    if (problem) return;
    const ok = await confirm({
      title: 'إرسال الرسالة',
      message: 'ستظهر هذه الرسالة لجميع المستخدمين كنافذة منبثقة إلى أن يطّلع عليها كل منهم.\nهل تريد إرسالها؟',
      confirmLabel: 'إرسال للجميع',
    });
    if (!ok) return;
    setSending(true);
    try {
      await api.createAnnouncement({
        title: form.title.trim(),
        message: form.message.trim(),
        level: form.level,
        expires_at: expiresAtFrom(form.expiry),
        image: image?.base64 ?? null,
      });
      setForm(EMPTY_FORM);
      setImage(null);
      onNotify?.('تم إرسال الرسالة إلى جميع المستخدمين.');
      await load();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (item) => {
    const ok = await confirm({
      title: 'إلغاء الرسالة',
      message: 'ستتوقف الرسالة عن الظهور لمن لم يطّلع عليها بعد. من اطّلع عليها لن يتأثر.\nهل تريد إلغاءها؟',
      confirmLabel: 'إلغاء الرسالة',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.revokeAnnouncement(item.id);
      onNotify?.('تم إلغاء الرسالة.');
      await load();
    } catch (error) {
      onNotify?.(error.message, { type: 'error', duration: 4000 });
    }
  };

  const messageLeft = MAX_MESSAGE - form.message.length;

  return (
    <TabCard maxWidth={900}>
      <SectionHeader
        icon={Megaphone}
        title="رسائل لجميع المستخدمين"
        description="تظهر الرسالة كنافذة منبثقة لكل مستخدم فور فتحه التطبيق (أو خلال نحو 30 ثانية إن كان فاتحاً)، وتتكرر حتى يضغط «تم الاطلاع»."
        action={
          <button type="button" onClick={load} style={smallOutlineButtonStyle}>
            <RefreshCw size={14} style={{ verticalAlign: 'middle' }} /> تحديث
          </button>
        }
      />

      {loadError?.unsupported && (
        <p className="ann-unsupported" role="alert">
          الخادم الشغّال لا يحتوي مسارات الرسائل (<code dir="ltr">/api/announcements</code>، الرمز {loadError.status}). تحديث الواجهة من شاشة «تحديثات التطبيق» لا يشمل كود الخادم،
          فانشر ملفات الخلفية المحدّثة على الاستضافة (نشر عادي) وأعد تشغيل الخادم. للتأكد افتح <code dir="ltr">/docs</code> وابحث عن قسم <code dir="ltr">announcements</code>.
        </p>
      )}

      <Panel title="رسالة جديدة" icon={Send}>
        <Field label="العنوان" optional hint={`${form.title.length} / ${MAX_TITLE}`}>
          <input className="warm-input" value={form.title} onChange={set('title')} maxLength={MAX_TITLE} placeholder="مثال: تغيير موعد الاجتماع" />
        </Field>

        <Field label="نص الرسالة" required error={formError || undefined} hint={messageLeft < 100 ? `المتبقي ${messageLeft} حرفاً` : undefined}>
          <textarea className="warm-textarea" rows={5} value={form.message} onChange={set('message')} maxLength={MAX_MESSAGE} placeholder="اكتب الرسالة التي ستظهر للمستخدمين..." />
        </Field>

        <div className="ann-image-field">
          <div className="ann-seg-label">صورة <span className="ann-optional">(اختياري)</span></div>
          <input ref={fileInput} type="file" accept={ACCEPTED_TYPES.join(',')} hidden onChange={pickImage} />
          {image ? (
            <div className="ann-image-chip">
              <img src={image.previewUrl} alt="معاينة الصورة المرفقة" />
              <span className="ann-image-info">{image.width}×{image.height} • {formatBytes(image.bytes)}</span>
              <button type="button" className="error-secondary" onClick={() => fileInput.current?.click()} disabled={imageBusy}>تغيير</button>
              <button type="button" className="error-secondary" onClick={() => setImage(null)} aria-label="إزالة الصورة"><X size={14} /> إزالة</button>
            </div>
          ) : (
            <button type="button" className="error-secondary" onClick={() => fileInput.current?.click()} disabled={imageBusy}>
              {imageBusy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />} {imageBusy ? 'جاري تجهيز الصورة...' : 'إضافة صورة'}
            </button>
          )}
          <p className="field-message field-hint">تُصغَّر الصورة وتُضغط تلقائياً وتُحفظ بصيغة JPEG (تفقد الشفافية والحركة).</p>
          {imageError && <p className="field-message field-error" role="alert">{imageError}</p>}
        </div>

        <div className="ann-form-row">
          <div>
            <div className="ann-seg-label" id="ann-level-label">المستوى</div>
            <div className="seg" role="radiogroup" aria-labelledby="ann-level-label">
              {Object.entries(ANNOUNCEMENT_LEVELS).map(([id, { label }]) => (
                <button key={id} type="button" role="radio" aria-checked={form.level === id} className={`seg-btn ${form.level === id ? 'selected' : ''}`} onClick={() => setForm((f) => ({ ...f, level: id }))}>
                  {label}
                </button>
              ))}
            </div>
            {form.level === 'urgent' && <p className="field-message field-hint">العاجلة لا يستطيع المستخدم تأجيلها: لا تُغلق إلا بزر «تم الاطلاع».</p>}
          </div>

          <Field label="مدة الصلاحية">
            <select className="warm-select" value={form.expiry} onChange={set('expiry')}>
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {form.message.trim() && (
          <div className="ann-preview" aria-label="معاينة">
            <div className="ann-preview-title">معاينة كما ستظهر</div>
            <div className={`ann-card ann-level-${form.level}`}>
              <div className="ann-meta"><span className="ann-level">{ANNOUNCEMENT_LEVELS[form.level].label}</span></div>
              {form.title.trim() && <strong className="ann-preview-heading">{form.title.trim()}</strong>}
              <p className="ann-message">{form.message.trim()}</p>
              {image && <img className="ann-preview-image" src={image.previewUrl} alt="" />}
            </div>
          </div>
        )}

        <button type="button" className="btn-warm-primary" onClick={handleSend} disabled={sending || imageBusy || !form.message.trim()}>
          <Send size={16} /> {sending ? 'جاري الإرسال...' : 'إرسال للجميع'}
        </button>
      </Panel>

      <Panel title={`الرسائل السابقة${items ? ` (${items.length})` : ''}`}>
        {loadError && !loadError.unsupported && <p className="field-message field-error" role="alert">{loadError.message}</p>}
        {items === null && !loadError && <p className="list-empty" role="status">جاري التحميل...</p>}
        {items?.length === 0 && <p className="list-empty">لم تُرسل أي رسالة بعد.</p>}

        <div className="ann-history">
          {items?.slice(0, pager.visible).map((item) => {
            const status = announcementStatus(item);
            const view = STATUS_VIEW[status];
            const level = ANNOUNCEMENT_LEVELS[item.level] ? item.level : 'info';
            return (
              <article key={item.id} className="ann-history-row">
                <div className="ann-history-head">
                  <strong className="ann-history-title">{item.title?.trim() || 'بلا عنوان'}</strong>
                  <span className="ann-history-badges">
                    <span className={`ann-level ann-level-chip ann-level-${level}`}>{ANNOUNCEMENT_LEVELS[level].label}</span>
                    <StatusBadge tone={view.tone} small>{view.label}</StatusBadge>
                  </span>
                </div>
                <p className="ann-history-message">{item.message}</p>
                {item.has_image && (
                  <div className="ann-history-image">
                    <button type="button" className="error-secondary" aria-expanded={openImages.has(item.id)} onClick={() => toggleImage(item.id)}>
                      <ImageIcon size={14} /> {openImages.has(item.id) ? 'إخفاء الصورة' : 'عرض الصورة المرفقة'}
                    </button>
                    {openImages.has(item.id) && <AnnouncementImage id={item.id} />}
                  </div>
                )}
                <div className="ann-history-foot">
                  <span style={{ color: COLORS.muted, fontSize: '12.5px' }}>
                    {formatWhen(item.created_at)}
                    {item.created_by ? ` • ${item.created_by}` : ''}
                    {item.expires_at ? ` • تنتهي ${formatWhen(item.expires_at)}` : ' • بلا انتهاء'}
                    {typeof item.read_count === 'number' && typeof item.recipient_count === 'number' ? ` • اطّلع ${item.read_count} من ${item.recipient_count}` : ''}
                  </span>
                  {status === 'active' && (
                    <button type="button" onClick={() => handleRevoke(item)} style={smallOutlineButtonStyle}>
                      <Trash2 size={14} style={{ verticalAlign: 'middle' }} /> إلغاء
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <ShowMore pager={pager} total={items?.length ?? 0} pageSize={PAGE_SIZE} noun="رسالة" />
      </Panel>
    </TabCard>
  );
}
