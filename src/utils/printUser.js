// المستخدم الحالي لطباعة "طُبع بواسطة" في ترويسة كل مطبوعة. يضبطه App عند الدخول ويمسحه عند الخروج.
let printUser = '';
export const setPrintUser = (name) => {
  printUser = name || '';
};
export const getPrintUser = () => printUser;
