// Enter ينقل التركيز للحقل التالي، وفي آخر حقل يرسل النموذج
export function handleEnterAsTab(e) {
  if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return;
  const form = e.target.form;
  if (!form) return;
  e.preventDefault();

  const fields = Array.from(form.elements).filter(
    (el) =>
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) && !el.disabled && el.type !== 'hidden'
  );
  const index = fields.indexOf(e.target);
  if (index > -1 && index < fields.length - 1) {
    fields[index + 1].focus();
  } else if (index === fields.length - 1) {
    form.requestSubmit();
  }
}
