// تطبيع النصوص للبحث العربي: يتجاهل التشكيل والتطويل، ويوحّد الهمزات والألف المقصورة والتاء المربوطة،
// ويحوّل الأرقام الهندية (٠-٩) والفارسية إلى لاتينية، فيجد «أحمد» و«احمد» و«٠٧٩» و«079» بنفس الطريقة.
export const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();

export const tokensOf = (query) => normalizeText(query).split(' ').filter(Boolean);

// كل كلمات البحث يجب أن تظهر في النص (بأي ترتيب)
export const matchesAll = (haystack, tokens) => tokens.every((t) => haystack.includes(t));
