import { Panel } from '../../components/common/layout';
import { useMemo, useRef, useState } from 'react';
import { newId } from '../../utils/id';
import { Pill, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_USAGE } from '../../constants';
import Autocomplete from '../../components/common/Autocomplete';
import { useSuggestionHistory } from '../../components/common/SuggestionsContext';
import { rankMatches, usageEntries } from '../../utils/suggestions';
import { COLORS, iconButtonStyle } from '../../styles';

export const formatPrescription = (meds) =>
  meds
    .map((m) => `${m.name}${m.active_ingredient ? ` (${m.active_ingredient})` : ''} — ${m.usage}`)
    .join(' ، ');

const getMedText = (m) => `${m.name} ${m.active_ingredient ?? ''}`;
const renderMed = (m) => (
  <div>
    <strong>💊 {m.name}</strong>
    <span style={{ display: 'block', marginRight: '22px', color: COLORS.muted, fontWeight: '500' }}>
      المادة الفعالة: {m.active_ingredient}
    </span>
  </div>
);
const usageText = (e) => e.text;
const renderUsage = (e) => (
  <>
    {e.pinned ? '⭐' : '🕒'} {e.text}
  </>
);

// بناء الوصفة الطبية: بحث عن دواء + طريقة الاستخدام + قائمة الأدوية المضافة
// onSaveUsage(medicationId, usage): يحفظ طريقة الاستخدام كافتراضية للدواء في قاعدة الأدوية (اختياري)
export default function PrescriptionBuilder({ meds, onChange, medications = [], onSaveUsage }) {
  const [query, setQuery] = useState('');
  const [usage, setUsage] = useState('');
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const usageRef = useRef(null);
  const history = useSuggestionHistory();

  // اقتراحات الاستخدام: المحفوظ لهذا الدواء، ثم ما وُصف له سابقاً، ثم الشائع والجاهز
  const usageItems = useMemo(
    () => rankMatches(usageEntries({ medication: selectedMedication, medName: query, history }), usage, 8),
    [selectedMedication, query, history, usage]
  );
  const canSaveDefault = Boolean(onSaveUsage && selectedMedication && usage.trim() && usage.trim() !== (selectedMedication.usage ?? ''));

  const addMed = () => {
    const name = query.trim();
    if (!name) return;
    if (saveAsDefault && canSaveDefault) onSaveUsage(selectedMedication.id, usage.trim());
    onChange([
      ...meds,
      {
        id: newId(),
        name,
        active_ingredient: selectedMedication?.active_ingredient ?? '',
        usage: usage.trim() || DEFAULT_USAGE,
      },
    ]);
    setQuery('');
    setUsage('');
    setSelectedMedication(null);
    setSaveAsDefault(false);
  };

  const removeMed = (id) => onChange(meds.filter((m) => m.id !== id));

  return (
    <Panel title="إدخال الأدوية في الوصفة الطبية" icon={Pill} style={{ marginTop: '16px', marginBottom: '20px' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '10px' }}>
        <Autocomplete
          value={query}
          onChange={(value) => {
            setQuery(value);
            setSelectedMedication(null);
          }}
          items={medications}
          getText={getMedText}
          renderItem={renderMed}
          onSelect={(med) => {
            setQuery(med.name);
            setSelectedMedication(med);
            if (med.usage && !usage.trim()) setUsage(med.usage); // طريقة الاستخدام المحفوظة لهذا الدواء
            usageRef.current?.focus();
          }}
          placeholder="ابحث باسم الدواء أو المادة الفعالة"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              usageRef.current?.focus();
            }
          }}
        />

        <Autocomplete
          inputRef={usageRef}
          value={usage}
          onChange={setUsage}
          items={usageItems}
          prefiltered
          getText={usageText}
          renderItem={renderUsage}
          onSelect={(entry) => setUsage(entry.text)}
          minChars={0}
          placeholder="طريقة الاستخدام (اكتب أو اختر)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addMed();
            }
          }}
        />

        <button
          type="button"
          onClick={addMed}
          className="btn-warm-primary"
          style={{ height: '42px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
          <Plus size={18} /> إضافة
        </button>
      </div>

      {canSaveDefault && (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '12.5px', color: COLORS.muted, cursor: 'pointer' }}>
          <input type="checkbox" checked={saveAsDefault} onChange={(e) => setSaveAsDefault(e.target.checked)} />
          حفظ هذه الطريقة كطريقة استخدام افتراضية للدواء «{selectedMedication.name}»
        </label>
      )}

      {meds.length > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', color: COLORS.muted }}>الأدوية المضافة للوصفة:</span>
          {meds.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.white, padding: '8px 14px', borderRadius: '10px', border: `1px solid ${COLORS.border}`, fontSize: '13px' }}>
              <div>
                <strong style={{ color: COLORS.ink }}>{m.name}</strong>
                <span style={{ color: COLORS.gold, marginRight: '8px', fontWeight: '700' }}>— {m.usage}</span>
              </div>
              <button type="button" onClick={() => removeMed(m.id)} aria-label="حذف الدواء" style={iconButtonStyle(COLORS.danger)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
