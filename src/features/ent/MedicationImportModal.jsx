import { useState } from 'react';
import { FileUp } from 'lucide-react';
import { COLORS } from '../../styles';
import Modal from '../../components/common/Modal';
import Field from '../../components/common/Field';
import FormActions from '../../components/common/FormActions';

const MAX_SIZE = 10 * 1024 * 1024; // يطابق MAX_FILE_SIZE في الخادم

// استيراد قاعدة الأدوية من ملف CSV أو XLSX. onImport(file) تعيد { imported, updated, skipped } أو ترمي خطأ برسالة جاهزة.
export default function MedicationImportModal({ onImport, onClose }) {
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0); // لتفريغ حقل الملف بعد الاستيراد
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const picked = e.target.files?.[0] ?? null;
    setResult(null);
    setError('');
    if (picked && picked.size > MAX_SIZE) {
      setFile(null);
      setError('حجم الملف يتجاوز الحد المسموح (10 ميغابايت).');
      return;
    }
    setFile(picked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await onImport(file));
      setFile(null);
      setInputKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'تعذر استيراد الملف.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="استيراد قاعدة الأدوية"
      icon={FileUp}
      subtitle="ملف CSV (بترميز UTF-8) أو XLSX، بحد أقصى 5000 دواء. الأدوية الموجودة بنفس الاسم تُحدَّث موادها الفعالة."
      maxWidth={520}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <Field label="الملف" required>
          <input key={inputKey} type="file" accept=".csv,.xlsx" className="warm-input" onChange={handleFile} disabled={busy} />
        </Field>
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: COLORS.muted }}>
          يجب أن يحتوي الصف الأول على عمودي «اسم الدواء» و«المادة الفعالة» (أو drug name / active ingredient). ويمكن إضافة عمود اختياري «طريقة الاستخدام» (أو usage) لتُحفظ كطريقة افتراضية للدواء.
        </p>

        {error && (
          <div role="alert" style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '10px', background: COLORS.dangerBg, color: COLORS.dangerText, fontSize: '13px', fontWeight: '700' }}>
            {error}
          </div>
        )}
        {result && (
          <div role="status" style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '10px', background: COLORS.successBg, color: COLORS.successText, fontSize: '13px', fontWeight: '700' }}>
            تم الاستيراد: {result.imported} دواء جديد، {result.updated} محدَّث
            {result.skipped > 0 ? `، وتم تخطي ${result.skipped} صف ناقص` : ''}.
          </div>
        )}

        <FormActions onCancel={onClose} submitLabel={busy ? 'جارٍ الاستيراد...' : 'استيراد'} submitIcon={FileUp} disabled={!file || busy} />
      </form>
    </Modal>
  );
}
