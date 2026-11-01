import { usePatientInsurance } from '../../hooks/usePatientInsurance';
import { useDraft } from '../../hooks/useDraft';
import DraftBanner from '../../components/common/DraftBanner';
import InsuranceSelector, { insuranceDetails } from '../../components/common/InsuranceSelector';
import { useState } from 'react';
import AppointmentQueue from '../schedule/AppointmentQueue';
import PatientSearch from '../../components/common/PatientSearch';
import { Ear, Send, Settings, Tag } from 'lucide-react';
import { DEPARTMENTS } from '../../constants';
import { COLORS, outlineGoldButtonStyle } from '../../styles';
import { formatMoney } from '../../utils/format';
import { handleEnterAsTab } from '../../utils/form';
import { SectionHeader, TabCard } from '../../components/common/layout';
import Field from '../../components/common/Field';
import Autocomplete from '../../components/common/Autocomplete';
import ChargesPicker, { EMPTY_CHARGES, chargesItems, hasCharges, proceduresText, suppliesText } from '../../components/common/ChargesPicker';
import { withOffer } from '../offers/offerUtils';
import DiagnosisInput from '../../components/common/DiagnosisInput';
import { AudiogramEditor, EMPTY_AUDIOGRAM, audiogramSummary, hasAudiogram } from './Audiogram';

const getAidText = (aid) => `${aid.brand} ${aid.model}`;
const renderAid = (aid) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span>🎧 {aid.brand} {aid.model} ({aid.type})</span>
    <span style={{ fontSize: '12px', color: COLORS.gold, background: COLORS.soft, padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
      <Tag size={12} style={{ display: 'inline', marginLeft: '3px' }} /> {formatMoney(aid.price)}
    </span>
    <span style={{ fontSize: '11px', fontWeight: '800', color: (aid.stock ?? 0) === 0 ? COLORS.danger : COLORS.successText }}>
      المخزون: {aid.stock ?? 0}
    </span>
  </div>
);

// خدمة تخطيط السمع من قائمة الخدمات (قسم السمعيات، واسمها مثل: تخطيط السمع / تخطيط سمع / Audiogram)
const AUDIOGRAM_NAME = /تخطيط\s*(ال)?سمع|audiogram/i;
const findAudiogramService = (services) =>
  services.find((s) => s.dept === DEPARTMENTS.AUDIO && AUDIOGRAM_NAME.test(s.name)) ?? null;

const round2 = (n) => Math.round(n * 100) / 100;

export default function AudioTab({ patient, patients, services = [], supplies = [], offers = [], hearingAids, insuranceCompanies, onSelectPatient, onAddVisit, onManageAids, appointments, onPickAppointment, draftUser }) {
  const [summary, setSummary] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [insurance, setInsurance, resetInsurance] = usePatientInsurance(patient);
  const [aidQuery, setAidQuery] = useState('');
  const [selectedAid, setSelectedAid] = useState(null);
  const [serial, setSerial] = useState('');
  const [audiogram, setAudiogram] = useState(EMPTY_AUDIOGRAM);
  const [chargeAudiogram, setChargeAudiogram] = useState(true); // إضافة إجراء التخطيط للفاتورة تلقائياً
  const [freeAudiogram, setFreeAudiogram] = useState(false); // إجراء التخطيط مجاني (لا يُحاسَب عليه المريض)
  const [discount, setDiscount] = useState(''); // خصم يدوي بالدينار على فاتورة الزيارة
  const [charges, setCharges] = useState(EMPTY_CHARGES); // الإجراءات والمستلزمات المختارة يدوياً (غير تخطيط السمع التلقائي)

  // مسودة تلقائية للزيارة (تُستدعى بعد usePatientInsurance كي يُطبَّق التأمين المسترجع أخيراً)
  const draft = useDraft({
    userKey: draftUser,
    scope: 'audio',
    patient,
    patients,
    onSelectPatient,
    values: { summary, diagnosis, aidQuery, selectedAid, serial, audiogram, chargeAudiogram, freeAudiogram, discount, charges, insurance },
    hasContent: Boolean(summary.trim() || diagnosis.trim() || aidQuery.trim() || serial.trim() || hasAudiogram(audiogram) || hasCharges(charges) || discount),
    onRestore: (v) => {
      setSummary(v.summary ?? '');
      setDiagnosis(v.diagnosis ?? '');
      setAidQuery(v.aidQuery ?? '');
      setSelectedAid(v.selectedAid ?? null);
      setSerial(v.serial ?? '');
      setAudiogram(v.audiogram ?? EMPTY_AUDIOGRAM);
      setChargeAudiogram(v.chargeAudiogram ?? true);
      setFreeAudiogram(v.freeAudiogram ?? false);
      setDiscount(v.discount ?? '');
      setCharges(v.charges ?? EMPTY_CHARGES);
      if (v.insurance) setInsurance(v.insurance);
    },
  });

  const audioServices = services.filter((s) => s.dept === DEPARTMENTS.AUDIO);

  // إجراء التخطيط التلقائي يُضاف فقط إذا أُدخلت نتيجة تخطيط وكانت الخدمة موجودة في القائمة،
  // ولا يُكرَّر إن اختاره المستخدم بنفسه من قائمة الإجراءات
  const audiogramService = hasAudiogram(audiogram) ? findAudiogramService(services) : null;
  const audiogramPicked = Boolean(audiogramService) && charges.procedures.some((p) => p.id === audiogramService.id);
  const addAudiogramFee = Boolean(audiogramService) && chargeAudiogram && !audiogramPicked;

  // الإجراءات والمستلزمات الفعلية للزيارة = تخطيط السمع (إن أُضيف) + ما اختاره المستخدم
  const effectiveCharges = {
    ...charges,
    procedures: [
      ...(addAudiogramFee ? [{ id: audiogramService.id, name: audiogramService.name, price: audiogramService.price, ...(freeAudiogram ? { free: true } : {}) }] : []),
      ...charges.procedures,
    ],
  };
  const hasChargeLines = hasCharges(effectiveCharges);

  // بنود الفاتورة قبل الخصم اليدوي: الإجراءات والمستلزمات + السماعة (إن اختيرت)
  const aidItem = selectedAid ? { description: `سماعة ${aidQuery}`, qty: 1, price: Number(selectedAid.price) } : null;
  const billableItems = [...chargesItems(effectiveCharges), ...(aidItem ? [aidItem] : [])];
  // عرض الخصم المختار يُطبَّق على كل البنود (بما فيها السماعة). مع الإجراءات وحدها يطبّقه التطبيق عند إصدار الفاتورة.
  const offered = withOffer(billableItems, effectiveCharges.offerId, offers, services);
  const subtotal = Math.max(0, round2(offered.items.reduce((t, i) => t + i.qty * i.price, 0)));
  const requestedDiscount = Math.max(0, Number(discount) || 0);
  const discountValue = Math.min(requestedDiscount, subtotal); // لا يتجاوز إجمالي الفاتورة؛ ولا يُطبَّق بلا بنود

  const handleSubmit = (e) => {
    e.preventDefault();

    const serialText = `(S/N: ${serial || 'غير مسجل'})`;
    let hearingAidText = 'بدون سماعة';
    if (selectedAid) {
      hearingAidText = `${aidQuery} [السعر: ${formatMoney(selectedAid.price)}] ${serialText}`;
    } else if (aidQuery.trim()) {
      hearingAidText = `${aidQuery.trim()} ${serialText}`;
    }

    // الفاتورة تُصدر عند وجود أي بند: إجراء أو مستلزم أو سماعة من قاعدة البيانات (لها سعر معروف)
    // الخصم اليدوي بند سالب في الفاتورة (كبند خصم العروض)
    // الإجراءات والمستلزمات وحدها (بلا سماعة ولا خصم يدوي) تُحفظ كتفاصيل منظّمة فيمكن تعديلها من الزيارة،
    // ويطبّق التطبيق عرض الخصم عليها. مع السماعة أو الخصم اليدوي تُحفظ التفاصيل أيضاً (ليُعاد المخزون عند حذف الزيارة)
    // لكن تُقفل (charges_locked) فلا تُعدَّل من الزيارة، وعرض الخصم يكون قد دخل البنود فلا يُطبَّق مرتين (تُعدَّل من قسم الفواتير)
    const structured = hasChargeLines && !selectedAid && discountValue === 0;
    const baseItems = structured ? billableItems : offered.items;
    const items = discountValue > 0 ? [...baseItems, { id: 'discount-manual', description: 'خصم', qty: 1, price: -discountValue }] : baseItems;

    const invoiceItem = items.length
      ? {
          service: [...effectiveCharges.procedures.map((p) => p.name), ...effectiveCharges.supplies.map((x) => `${x.name} ×${x.qty}`), ...(selectedAid ? [aidItem.description] : [])].join(' + '),
          total: round2(items.reduce((t, i) => t + i.qty * i.price, 0)),
          items,
          ...(hasChargeLines ? { charges: structured ? effectiveCharges : { ...effectiveCharges, offerId: '' } } : {}),
        }
      : null;

    onAddVisit(
      DEPARTMENTS.AUDIO,
      {
        summary,
        ...(diagnosis.trim() ? { diagnosis: diagnosis.trim() } : {}),
        hearing_aid: hearingAidText,
        ...(selectedAid ? { hearing_aid_id: selectedAid.id } : {}), // لخصم السماعة من المخزون
        ...(hasAudiogram(audiogram) ? { audiogram } : {}),
        ...(effectiveCharges.procedures.length > 0 ? { procedures: proceduresText(effectiveCharges) } : {}),
        ...(effectiveCharges.supplies.length > 0 ? { supplies_used: suppliesText(effectiveCharges) } : {}),
        ...(hasChargeLines && !structured ? { charges_locked: true } : {}),
        ...(discountValue > 0 ? { discount: discountValue } : {}),
        ...insuranceDetails(insurance, insuranceCompanies),
      },
      invoiceItem,
      effectiveCharges.supplies // تُخصم من المخزون
    );

    setSummary('');
    setDiagnosis('');
    setAidQuery('');
    setSelectedAid(null);
    setSerial('');
    setAudiogram(EMPTY_AUDIOGRAM);
    setChargeAudiogram(true);
    setFreeAudiogram(false);
    setCharges(EMPTY_CHARGES);
    setDiscount('');
    resetInsurance();
    draft.clear(); // الزيارة حُفظت: لا حاجة للمسودة
  };

  return (
    <TabCard>
      <SectionHeader
        title="قسم السمعيات وتجهيز السماعات الطبية"
        icon={Ear}
        action={
          <button onClick={onManageAids} style={{ ...outlineGoldButtonStyle, background: COLORS.card, fontWeight: '700', padding: '8px 14px' }}>
            <Settings size={16} color={COLORS.gold} /> إدارة قاعدة بيانات السماعات
          </button>
        }
      />
      <AppointmentQueue appointments={appointments} department={DEPARTMENTS.AUDIO} currentPatient={patient} onPick={onPickAppointment} />
      <PatientSearch patients={patients} patient={patient} onSelect={onSelectPatient} />

      <DraftBanner draft={draft} />

      <form onSubmit={handleSubmit}>
        <Field label="تخطيط السمع التفاعلي (Audiogram)" large collapsible>
          <AudiogramEditor value={audiogram} onChange={setAudiogram} />
          {hasAudiogram(audiogram) && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '13px', color: COLORS.text, cursor: audiogramService ? 'pointer' : 'default' }}>
              <input type="checkbox" checked={addAudiogramFee} disabled={!audiogramService || audiogramPicked} onChange={(e) => setChargeAudiogram(e.target.checked)} />
              {audiogramPicked
                ? `إجراء «${audiogramService.name}» مضاف أدناه ضمن الإجراءات الطبية المنفّذة.`
                : audiogramService
                ? `إضافة إجراء «${audiogramService.name}» (${formatMoney(audiogramService.price)}) إلى الزيارة والفاتورة تلقائياً`
                : 'لا توجد خدمة "تخطيط السمع" في قائمة الخدمات لإضافتها كإجراء.'}
            </label>
          )}
          {addAudiogramFee && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px', fontWeight: '700', color: COLORS.successText, cursor: 'pointer' }}>
              <input type="checkbox" checked={freeAudiogram} onChange={(e) => setFreeAudiogram(e.target.checked)} />
              هذا الإجراء مجاني (لا يُحاسَب المريض عليه ويظهر في تقرير الخدمات المجانية)
            </label>
          )}
        </Field>

        <Field label="التشخيص" optional large collapsible>
          <DiagnosisInput value={diagnosis} onChange={setDiagnosis} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
          <Field label="ملخص وتقييم الحالة" large collapsible>
            <textarea
              className="warm-textarea"
              rows="5"
              placeholder="العتبات السمعية والأذنين..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
            {hasAudiogram(audiogram) && (
              <button
                type="button"
                onClick={() => setSummary((s) => (s ? `${s}\n` : '') + audiogramSummary(audiogram))}
                style={{ ...outlineGoldButtonStyle, marginTop: '8px', fontSize: '12px', padding: '6px 12px' }}
              >
                إدراج نتيجة التخطيط في الملخص
              </button>
            )}
          </Field>

          <div>
            <Field label="اختر السماعة من قاعدة البيانات (لتصدر الفاتورة تلقائياً)" large collapsible>
              <div style={{ marginBottom: '12px' }}>
                <Autocomplete
                  value={aidQuery}
                  onChange={(value) => {
                    setAidQuery(value);
                    setSelectedAid(null); // تعديل النص يلغي الاختيار السابق
                  }}
                  items={hearingAids}
                  getText={getAidText}
                  renderItem={renderAid}
                  onSelect={(aid) => {
                    setAidQuery(getAidText(aid));
                    setSelectedAid(aid);
                  }}
                  placeholder="ابحث عن الماركة أو الموديل (مثال: Phonak, Oticon...)"
                  onKeyDown={handleEnterAsTab}
                />
              </div>
            </Field>

            {selectedAid && (
              <span style={{ fontSize: '12px', color: COLORS.gold, fontWeight: '800', display: 'block', marginTop: '-6px', marginBottom: '10px' }}>
                سعر السماعة المختارة: {formatMoney(selectedAid.price)} (سيتم إصدار الفاتورة تلقائياً عند الحفظ)
              </span>
            )}
            {selectedAid && (selectedAid.stock ?? 0) === 0 && (
              <span style={{ fontSize: '12px', color: COLORS.danger, fontWeight: '800', display: 'block', marginTop: '-4px', marginBottom: '10px' }}>
                تنبيه: هذا الموديل غير متوفر في المخزون (0). أدخل سماعات للمخزون من «إدارة قاعدة بيانات السماعات»، أو تابع إن كانت السماعة من خارج المخزون.
              </span>
            )}

            <Field label="الرقم التسلسلي (Serial No.)" large collapsible>
              <input
                type="text"
                className="warm-input"
                placeholder="الرقم التسلسلي للسماعة..."
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                onKeyDown={handleEnterAsTab}
              />
            </Field>
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <ChargesPicker procedures={audioServices} supplies={supplies} value={charges} onChange={setCharges} offers={offers} services={services} />
        </div>

        <div style={{ marginTop: '16px' }}>
          <Field label="الخصم (د.أ)" optional large collapsible>
            <input
              type="number"
              min="0"
              step="0.01"
              className="warm-input"
              placeholder="0.00"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              onKeyDown={handleEnterAsTab}
              style={{ maxWidth: '220px' }}
            />
          </Field>
          {requestedDiscount > 0 && billableItems.length === 0 && (
            <span style={{ fontSize: '12px', color: COLORS.danger, fontWeight: '700', display: 'block', marginTop: '-6px' }}>
              لا يوجد بند في الفاتورة (تخطيط أو إجراء أو مستلزم أو سماعة) ليُطبَّق عليه الخصم.
            </span>
          )}
          {requestedDiscount > 0 && billableItems.length > 0 && (
            <span style={{ fontSize: '12px', color: COLORS.gold, fontWeight: '800', display: 'block', marginTop: '-6px' }}>
              {requestedDiscount > subtotal ? `سيُخفَّض الخصم إلى ${formatMoney(subtotal)} (إجمالي الفاتورة). ` : ''}
              إجمالي الفاتورة بعد الخصم: {formatMoney(round2(subtotal - discountValue))}
            </span>
          )}
        </div>

        <div style={{ marginTop: '16px' }}>
          <InsuranceSelector companies={insuranceCompanies} value={insurance} onChange={setInsurance} />
        </div>

        <div style={{ textAlign: 'left', marginTop: '16px' }}>
          <button type="submit" className="btn-warm-primary" disabled={!patient}>
            <Send size={16} /> حفظ السمعيات وإصدار الفاتورة تلقائياً
          </button>
        </div>
      </form>
    </TabCard>
  );
}
