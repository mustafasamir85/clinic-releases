import { DEFAULT_USAGE } from '../constants';

// الوصفة تُحفظ نصاً: "اسم الدواء (المادة الفعالة) — طريقة الاستخدام ، دواء آخر ..."
// (وللوصفات القديمة: "اسم الدواء (طريقة الاستخدام)"). نعيدها قائمة {name, ingredient, usage}.
export const parsePrescription = (text) =>
  String(text ?? '')
    .split(' ، ')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const split = part.lastIndexOf(' — ');
      const withUsage = split >= 0;
      const head = withUsage ? part.slice(0, split) : part;
      const m = head.match(/^(.*?)\s*\(([^()]*)\)$/);
      if (withUsage) return { name: (m ? m[1] : head).trim(), ingredient: m ? m[2].trim() : '', usage: part.slice(split + 3).trim() };
      return m ? { name: m[1].trim(), ingredient: '', usage: m[2].trim() } : { name: head.trim(), ingredient: '', usage: '' };
    });

export const isDefaultUsage = (usage) => !usage || usage === DEFAULT_USAGE;
