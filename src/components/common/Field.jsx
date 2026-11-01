import { cloneElement, isValidElement, useId, useState } from 'react';
import { CollapseChevron } from './layout';
import { COLORS, labelLgStyle, labelStyle } from '../../styles';

const NATIVE_CONTROLS = new Set(['input', 'select', 'textarea']);

// هل يمكن ربط التسمية بهذا العنصر؟ حقول HTML الأصلية، أو مكوّن يعلن دعمه لـ id بالخاصية الساكنة acceptsId
// (Autocomplete و PasswordInput). غير ذلك (حاويات، محررات مركّبة) يُربط كمجموعة role="group".
const isLinkable = (el) => isValidElement(el) && ((typeof el.type === 'string' && NATIVE_CONTROLS.has(el.type)) || el.type?.acceptsId === true);

// تسمية + حقل.
//  - الربط التلقائي: التسمية مرتبطة بالحقل (htmlFor/id) فيُركَّز الحقل بالنقر على التسمية، ويقرأ قارئ الشاشة اسمه.
//  - required يضيف نجمة حمراء (للعين فقط؛ التزام الحقل نفسه بخاصية required عليه)، optional يضيف (اختياري).
//  - hint: نص مساعد تحت الحقل. error: رسالة خطأ تحت الحقل (تُعلَن لقارئ الشاشة ويُلوَّن الحقل بالأحمر).
export default function Field({ label, required, optional, large, collapsible, hint, error, style, children }) {
  const [open, setOpen] = useState(true);
  const uid = useId();
  const labelId = `${uid}-label`;
  const hintId = `${uid}-hint`;
  const errorId = `${uid}-error`;

  const linkable = isLinkable(children);
  const controlId = linkable ? children.props.id ?? `${uid}-control` : undefined;
  const messageId = error ? errorId : hint ? hintId : undefined;
  const describedBy = [linkable ? children.props['aria-describedby'] : undefined, messageId].filter(Boolean).join(' ') || undefined;

  const control = linkable
    ? cloneElement(children, {
        id: controlId,
        'aria-describedby': describedBy,
        ...(error ? { 'aria-invalid': true } : {}),
      })
    : children;

  // الحاوية تعمل كمجموعة مسمّاة حين يتعذّر ربط حقل واحد (مثلاً حقل + زر داخل div)
  const groupProps = linkable ? {} : { role: 'group', 'aria-labelledby': labelId, 'aria-describedby': describedBy };

  const labelContent = (
    <>
      {label}
      {required && <span style={{ color: COLORS.danger }} aria-hidden="true"> *</span>}
      {optional && <span style={{ color: COLORS.faint, fontWeight: 'normal' }}> (اختياري)</span>}
    </>
  );

  const messages = (
    <>
      {error ? (
        <p id={errorId} className="field-message field-error" role="alert">{error}</p>
      ) : hint ? (
        <p id={hintId} className="field-message field-hint">{hint}</p>
      ) : null}
    </>
  );

  if (collapsible) {
    return (
      <div style={style} {...groupProps}>
        <div className="panel-head" style={{ marginBottom: open ? '6px' : '12px' }}>
          <CollapseChevron open={open} onClick={() => setOpen((o) => !o)} label={open ? 'طي القسم' : 'فتح القسم'} />
          <label id={labelId} htmlFor={controlId} style={{ ...(large ? labelLgStyle : labelStyle), flex: 1 }}>
            {labelContent}
          </label>
        </div>
        <div className="section-collapse-body" hidden={!open}>
          {control}
          {messages}
        </div>
      </div>
    );
  }
  return (
    <div style={style} {...groupProps}>
      <label id={labelId} htmlFor={controlId} style={large ? labelLgStyle : labelStyle}>
        {labelContent}
      </label>
      {control}
      {messages}
    </div>
  );
}
