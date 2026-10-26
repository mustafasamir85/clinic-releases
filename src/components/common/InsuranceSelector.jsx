import { Panel } from './layout';
import { Shield } from 'lucide-react';
import { INSURANCE_STATUS } from '../../constants';
import { COLORS } from '../../styles';

// copay = المبلغ الثابت بالدينار الأردني الذي يتحمّله المريض؛ الباقي على شركة التأمين
export const NO_INSURANCE = { companyId: '', copay: '' };

// حقول الزيارة المحفوظة (تُدمج مع تفاصيل الزيارة)
export const insuranceDetails = (value, companies) => {
  const company = companies.find((c) => String(c.id) === String(value.companyId));
  if (!company) return {};
  return {
    insurance_company: company.name,
    insurance_copay: Math.max(0, Math.round((Number(value.copay) || 0) * 100) / 100),
  };
};

// اختيار شركة التأمين ومبلغ تحمّل المريض بالدينار (القيمة الابتدائية من ملف المريض).
export default function InsuranceSelector({ companies, value, onChange }) {
  // الشركات المعتمدة + الشركة المختارة حالياً حتى لو أُوقفت لاحقاً (كي لا يختفي اختيار المريض)
  const available = companies.filter(
    (c) => c.status === INSURANCE_STATUS.APPROVED || String(c.id) === String(value.companyId)
  );

  // مبلغ التحمّل يخص المريض لا الشركة: تغيير الشركة لا يغيّره، وإلغاء التأمين يفرّغه
  const handleCompany = (e) => {
    const companyId = e.target.value;
    onChange({ companyId, copay: companyId ? value.copay : '' });
  };

  return (
    <Panel title="التأمين الطبي" icon={Shield}>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.3fr', gap: '10px' }}>
        <select value={value.companyId} onChange={handleCompany} className="warm-select" style={{ margin: 0 }}>
          <option value="">بدون تأمين (دفع نقدي)</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div style={{ position: 'relative' }}>
          <input
            type="number"
            min="0"
            step="0.01"
            className="warm-input"
            placeholder="نسبة التحمل (د.أ)"
            aria-label="مبلغ تحمّل المريض بالدينار الأردني"
            required={Boolean(value.companyId)}
            value={value.copay}
            onChange={(e) => onChange({ ...value, copay: e.target.value })}
            disabled={!value.companyId}
            style={{ margin: 0, paddingLeft: '46px' }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '13px', color: COLORS.muted, fontWeight: '700', fontSize: '12px' }}>د.أ</span>
        </div>
      </div>
    </Panel>
  );
}
