import { CLINIC_NAME, CLINIC_SUBTITLE } from '../../constants';
import clinicLogo from '../../assets/logo.jpeg';

// ترويسة الطباعة الموحّدة: الشعار في المنتصف وتحته اسم المؤسسة. children = سطور عنوان المستند (اختيارية).
// bare = بلا حدّ سفلي (حين تكون الحاوية نفسها فيها حدّ).
export function PrintHeader({ children, bare = false }) {
  return (
    <div className={`print-brand${bare ? ' print-brand--bare' : ''}`}>
      <img className="print-clinic-logo" src={clinicLogo} alt={`شعار ${CLINIC_NAME}`} />
      <div className="print-brand-name">{CLINIC_NAME}</div>
      {CLINIC_SUBTITLE && <div className="print-brand-sub">{CLINIC_SUBTITLE}</div>}
      {children && <div className="print-brand-extra">{children}</div>}
    </div>
  );
}

// تذييل الطباعة (العنوان وأرقام التواصل والبريد و"طُبع بواسطة"). يوضع مرة واحدة في App ويفرغ إلى أن تبدأ الطباعة.
// المتصفحات الحديثة تطبعه أسفل كل صفحة عبر @page (انظر utils/printReport.js)، وغيرها يملأ هذا العنصر ويطبعه في آخر المستند.
export function PrintFooter() {
  return <footer className="print-footer" aria-hidden="true" />;
}
