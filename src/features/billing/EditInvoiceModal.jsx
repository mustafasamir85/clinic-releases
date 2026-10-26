import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { COLORS } from '../../styles';
import { formatMoney } from '../../utils/format';
import { isOfferRunning, offerValueText, withOffer } from '../offers/offerUtils';
import Field from '../../components/common/Field';
import { insuranceShare, invoiceCopay, invoiceItems, itemsTotal, patientDue } from '../../hooks/useInvoices';
import Modal from '../../components/common/Modal';
import FormActions from '../../components/common/FormActions';
import InvoiceItemsEditor, { cleanItems } from '../../components/common/InvoiceItemsEditor';
import { collapseFree, expandFree } from '../freeServices/freeUtils';

const round2 = (n) => Math.round(n * 100) / 100;

// تعديل بنود فاتورة قائمة. شركة التأمين ونسبتها تبقيان كما هما ويُعاد حساب حصتها على الإجمالي الجديد.
export default function EditInvoiceModal({ invoice, offers, services, onSubmit, onClose }) {
  const all = invoiceItems(invoice);
  // بند الخصم المرتبط بعرض يُفصل عن البنود العادية: يمكن تطبيقه أو إلغاؤه من القائمة
  const [offerId, setOfferId] = useState(() => String(all.find((i) => i.offer_id)?.offer_id ?? ''));
  const [items, setItems] = useState(() => collapseFree(all.filter((i) => !i.offer_id).map((i, idx) => ({ ...i, id: i.id ?? `e${idx}` }))));
  const [error, setError] = useState('');

  const clean = expandFree(cleanItems(items));
  const options = offers.filter((o) => isOfferRunning(o) || String(o.id) === offerId);
  const { items: finalItems, discount, error: discountError } = withOffer(clean, offerId, offers, services);
  const total = itemsTotal(finalItems);
  const share = invoice.insurance_company ? insuranceShare(total, { name: invoice.insurance_company, copay: invoiceCopay(invoice) }).amount : 0;
  const due = round2(total - share);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (discountError) return setError(discountError);
    if (clean.length === 0) return setError('أضف بنداً واحداً على الأقل بوصف وكمية وسعر صحيحين.');
    if (total < 0) return setError('الإجمالي لا يمكن أن يكون سالباً. راجع بنود الخصم.');
    // لا نسمح بأن يصبح المستحق أقل مما دفعه المريض فعلاً
    if (due < invoice.paid) {
      return setError(`المستحق الجديد (${formatMoney(due)}) أقل من المبلغ المدفوع (${formatMoney(invoice.paid)}). لا يمكن التخفيض لأقل من المدفوع.`);
    }
    onSubmit(invoice.id, finalItems);
  };

  return (
    <Modal title={`تعديل الفاتورة ${invoice.inv_no}`} subtitle={`الإسم: ${invoice.patient_name}`} icon={Edit2} maxWidth={720} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <InvoiceItemsEditor items={items} onChange={setItems} suggestions={services.map((s) => s.name)} />

        {options.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <Field label="العرض المطبَّق على الفاتورة">
              <select className="warm-select" style={{ margin: 0 }} value={offerId} onChange={(e) => setOfferId(e.target.value)}>
                <option value="">بدون عرض</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>{o.name} — خصم {offerValueText(o)}</option>
                ))}
              </select>
            </Field>
            {offerId && (
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', fontWeight: '700', color: discountError ? COLORS.danger : COLORS.successText }}>
                {discountError || `قيمة الخصم: ${formatMoney(discount)}`}
              </p>
            )}
          </div>
        )}

        <div style={{ background: COLORS.soft, borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '700', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span>الإجمالي الجديد: {formatMoney(total)}</span>
          {share > 0 && <span style={{ color: COLORS.successText }}>على {invoice.insurance_company}: {formatMoney(share)}</span>}
          <span>المستحق على المريض: <span style={{ color: COLORS.gold }}>{formatMoney(due)}</span></span>
          <span>المدفوع: {formatMoney(invoice.paid)}</span>
        </div>

        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: COLORS.muted }}>
          تعديل البنود هنا لا يغيّر المخزون ولا بيانات الزيارة. وإذا عُدّلت إجراءات الزيارة نفسها لاحقاً فستُعاد كتابة بنود فاتورتها.
        </p>

        {error && <p style={{ color: COLORS.danger, fontSize: '13px', fontWeight: '700', margin: '12px 0 0 0' }} role="alert">{error}</p>}

        <FormActions onCancel={onClose} submitLabel="حفظ التعديلات" />
      </form>
    </Modal>
  );
}
