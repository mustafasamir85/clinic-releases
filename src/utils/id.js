// معرّف رقمي فريد للسجلات الجديدة (الأرقام تبقى متوافقة مع باقي الواجهة التي تقارن المعرّفات رقمياً).
// = الوقت بالميلي ثانية × 1000 + رقم عشوائي من 3 خانات، ومتزايد دائماً داخل الجلسة الواحدة
// فلا يتكرر عند الإضافة السريعة، ويقلّ احتمال التصادم بين جهازين (يبقى أقل من Number.MAX_SAFE_INTEGER).
let last = 0;

export function newId() {
  const random = crypto.getRandomValues(new Uint16Array(1))[0] % 1000;
  const id = Date.now() * 1000 + random;
  last = id > last ? id : last + 1;
  return last;
}
