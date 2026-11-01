import { COMPRESSION_PLAN, MAX_DIMENSION, MAX_UPLOAD_BYTES, TARGET_BYTES, dataUrlToBase64, scaleToFit, validateImageFile } from './imageUtils';

// يحمّل الصورة كـ bitmap (يحترم اتجاه EXIF في المتصفحات الحديثة)
async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      /* نجرّب الطريقة البديلة */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const readAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('تعذّر قراءة الصورة.'));
    reader.readAsDataURL(blob);
  });

// يجهّز صورة للرفع: يصغّرها (أطول ضلع ≤ 1280px) ويضغطها JPEG بتدرّج جودة حتى يصبح حجمها مناسباً.
// الشفافية تُسطَّح على خلفية بيضاء، والـ GIF المتحرك يصبح إطاراً ثابتاً.
// يعيد { base64, previewUrl (blob URL: على المستدعي revokeObjectURL له), width, height, bytes } أو يرمي Error برسالة عربية.
export async function prepareImage(file) {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  let bitmap;
  try {
    bitmap = await loadBitmap(file);
  } catch {
    throw new Error('تعذّر فتح الصورة. قد يكون الملف تالفاً.');
  }

  try {
    let best = null;
    for (const [factor, quality] of COMPRESSION_PLAN) {
      const { width, height } = scaleToFit(bitmap.width * factor, bitmap.height * factor, MAX_DIMENSION);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (!blob) continue;
      best = { blob, width, height };
      if (blob.size <= TARGET_BYTES) break;
    }
    if (!best || best.blob.size > MAX_UPLOAD_BYTES) throw new Error('الصورة كبيرة جداً حتى بعد الضغط. اختر صورة أصغر.');

    return {
      base64: dataUrlToBase64(await readAsDataUrl(best.blob)),
      previewUrl: URL.createObjectURL(best.blob),
      width: best.width,
      height: best.height,
      bytes: best.blob.size,
    };
  } finally {
    bitmap.close?.();
  }
}
