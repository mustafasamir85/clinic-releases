# مواصفات واجهة السيرفر لرسائل مدير النظام

> **الحالة:** نُفِّذت في `backend-improved.zip` (انظر `app/announcements.py` و`app/routers/announcements.py`). هذا الملف يبقى مرجعاً للعقد بين الواجهة والخادم.

الواجهة الأمامية جاهزة (في `src-improved.zip`) وتتوقع هذه المسارات. لم يكن كود السيرفر ضمن الملف المرفق،
فالمواصفات أدناه عقد (contract) يُنفَّذ في السيرفر. كل المسارات تحت `/api` (أي `API_BASE_URL`) وتستعمل نفس رمز الدخول (Bearer) ونفس صيغة الأخطاء `{"detail": "..."}`.

## المسارات

| الطريقة والمسار | من يستعملها | الوصف |
|---|---|---|
| `GET /announcements/active` | **كل مستخدم مسجّل** | الرسائل النشطة التي لم يطّلع عليها المستخدم الحالي |
| `POST /announcements/{id}/ack` | كل مستخدم مسجّل | تسجيل أن المستخدم الحالي اطّلع على الرسالة |
| `GET /announcements/{id}/image` | كل مستخدم مسجّل* | صورة الرسالة المرفقة (*لغير المدير: ما دامت الرسالة نشطة، وإلا 404) |
| `GET /announcements` | **مدير النظام فقط** | سجل كل الرسائل مع أعداد من اطّلع |
| `POST /announcements` | مدير النظام فقط | إنشاء رسالة جديدة |
| `DELETE /announcements/{id}` | مدير النظام فقط | إلغاء رسالة (لا تُحذف من السجل) |

مدير النظام = `role == "admin"` (كما تفعل شاشة النسخ الاحتياطي). غير المدير يتلقى `403` على المسارات الإدارية.

## الأشكال

**عنصر في `GET /announcements/active`** (مرتّب كما يشاء السيرفر؛ الواجهة تعيد ترتيبه):
```json
{ "items": [
  { "id": "a1", "title": "اجتماع", "message": "نص الرسالة", "level": "info",
    "created_by": "اسم المدير", "created_at": "2026-11-01T10:00:00Z", "expires_at": null, "has_image": false }
] }
```

**عنصر في `GET /announcements`** (الأحدث أولاً): نفس الحقول مضافاً إليها
`revoked_at` (تاريخ الإلغاء أو `null`)، `read_count` (عدد من اطّلع)، `recipient_count` (عدد المستخدمين).

**جسم `POST /announcements`:**
```json
{ "title": "", "message": "نص الرسالة", "level": "info", "expires_at": "2026-11-08T10:00:00Z", "image": null }
```
- `message`: مطلوب، 1–1000 حرف بعد إزالة الفراغات الطرفية. `title`: اختياري، حتى 80 حرفاً.
- `level`: واحد من `info` | `important` | `urgent`.
- `expires_at`: تاريخ ISO في المستقبل، أو `null` = بلا انتهاء.
- `image`: اختياري، صورة بترميز base64 خام (يُقبل أيضاً data URL). JPEG أو PNG أو WebP أو GIF فقط، حتى 1,500,000 بايت بعد فك الترميز. يحدد الخادم النوع من بصمة الملف ويرفض غيره (ومنه SVG) بـ 422.
- الرد: العنصر المُنشأ (status 200/201). أخطاء التحقق: `422` أو `400` مع `detail` نصّي.

`POST /announcements/{id}/ack` و `DELETE /announcements/{id}`: رد `204` بلا جسم. معرّف غير موجود: `404`.

## القواعد

1. **«نشطة»** = غير ملغاة (`revoked_at` فارغ) **و** (`expires_at` فارغ أو في المستقبل).
2. `GET /announcements/active` يعيد النشطة التي **ليس للمستخدم الحالي سجل اطّلاع عليها**. التتبع **لكل مستخدم** (وليس لكل جهاز)،
   فمن اطّلع من جهاز لا تظهر له من جهاز آخر.
3. `ack` **idempotent**: تكراره لا يُنتج خطأ ولا سجلاً مكرراً. ويُسمح به فقط لرسالة نشطة (أو يُتجاهَل بصمت لغيرها بـ 204).
4. منشئ الرسالة يُعدّ مطّلعاً عليها تلقائياً (لا تظهر له نافذة رسالته).
5. المستخدم الذي يُنشأ بعد إرسال الرسالة يراها إن كانت لا تزال نشطة (ينتج ذلك طبيعياً من القاعدة 2).
6. `recipient_count` = عدد المستخدمين **الفعّالين** وقت الطلب. `read_count` = من اطّلع منهم (المعطَّلون لا يُحتسبون، فلا يتجاوز العدد الإجمالي).
7. الإلغاء يضبط `revoked_at` ولا يحذف السجلات ولا سجلات الاطّلاع. من اطّلع لا يتأثر؛ ومن لم يطّلع لا تظهر له بعد الآن.
8. `has_image` منطقي في كل عنصر. بايتات الصورة **لا** تُرسل مع القوائم (تُجلب بطلب مستقل حسب الحاجة)، وتُخزَّن في جدول منفصل `announcement_images`. الواجهة تصغّر الصورة وتضغطها JPEG قبل الرفع (أطول ضلع 1280px، نحو 700KB).
9. الواجهة تعرض النص كنص عادي (لا HTML)، لكن يُستحسن أن يرفض السيرفر أو يهرّب أي وسوم احتياطاً.

## مخطط جداول مقترح (SQL عام؛ كيّفه مع طبقة البيانات عندك)

```sql
CREATE TABLE announcements (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  message       TEXT NOT NULL,
  level         TEXT NOT NULL CHECK (level IN ('info','important','urgent')),
  created_by    TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  expires_at    TEXT,
  revoked_at    TEXT
);
CREATE TABLE announcement_reads (
  announcement_id TEXT NOT NULL REFERENCES announcements(id),
  user_id         TEXT NOT NULL,
  read_at         TEXT NOT NULL,
  PRIMARY KEY (announcement_id, user_id)
);
```

استعلام الرسائل غير المقروءة (مبدئياً):
```sql
SELECT a.* FROM announcements a
WHERE a.revoked_at IS NULL
  AND (a.expires_at IS NULL OR a.expires_at > :now)
  AND NOT EXISTS (SELECT 1 FROM announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = :user)
ORDER BY a.created_at;
```

## سلوك الواجهة المرتبط بالعقد

- تُجلب `/announcements/active` عند فتح التطبيق، ثم كل 30 ثانية ما دام التبويب ظاهراً، وعند العودة إليه. أي: طلب صغير واحد لكل مستخدم كل 30 ثانية.
- إن أعاد السيرفر `403/404/405/501` على هذا المسار تتوقف الواجهة عن السؤال بصمت (الميزة غير مفعّلة)، وتعرض شاشة المدير تنبيهاً بأن الخادم لا يدعمها بعد.
- أخطاء الشبكة والأخطاء المؤقتة (5xx) تُتجاهل وتُعاد المحاولة في الدورة التالية.

## اختبار سريع بعد التنفيذ

```bash
# كمدير: إرسال
curl -X POST $API/announcements -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" \
  -d '{"title":"تجربة","message":"رسالة تجريبية","level":"info","expires_at":null}'
# كمستخدم عادي: تظهر في active ثم تختفي بعد ack
curl $API/announcements/active -H "Authorization: Bearer $USER"
curl -X POST $API/announcements/ID/ack -H "Authorization: Bearer $USER"
curl $API/announcements/active -H "Authorization: Bearer $USER"   # فارغة الآن
# مستخدم عادي على مسار المدير: يجب 403
curl -i $API/announcements -H "Authorization: Bearer $USER"
```
