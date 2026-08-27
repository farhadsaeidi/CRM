/**
 * خواندنِ پیامِ خطا از پاسخِ سرور.
 *
 * ⚠️ سرور **سه شکلِ متفاوت** خطا برمی‌گرداند و هر کامپوننتی که فقط یکی را بخواند،
 * بقیه را به «خطای نامعلوم» تبدیل می‌کند:
 *
 *   ۱. `{detail: "..."}`            ← خودِ DRF: احراز هویت، throttle، ۴۰۴، parser
 *   ۲. `{message: "..."}`           ← ویوهای خودمان
 *   ۳. `{business_name: ["..."]}`   ← اعتبارسنجیِ سریالایزر، کلیدِ فیلد در **ریشه**
 *
 * ترتیبِ خواندن همان است که در `CLAUDE.md` ثبت شده: اول `detail`، بعد `message`،
 * بعد فیلدها. یک‌جا جمع است تا در هر مودال یک نسخهٔ ناقص از آن تکرار نشود —
 * همان دلیلی که ولیدیتورها هم در یک فایل‌اند.
 */

// وقتی بدنه‌ای در کار نیست، خودِ کدِ وضعیت تنها چیزی است که می‌دانیم. این
// پیام‌ها به کاربر می‌گویند چه **کاری** بکند، نه فقط اینکه چیزی خراب است.
const BY_STATUS = {
    401: "نشستِ شما منقضی شده است. دوباره وارد شوید.",
    403: "نشستِ شما منقضی شده است. دوباره وارد شوید.",
    413: "حجمِ فایل بیش از حد مجاز است.",
    415: "قالبِ داده‌ای که فرستاده شد پشتیبانی نمی‌شود.",
    429: "درخواست‌های زیادی فرستاده شده. کمی بعد دوباره تلاش کنید.",
    502: "ارتباط با سرور برقرار نشد. کمی بعد دوباره تلاش کنید.",
    503: "سرویس موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.",
    504: "پاسخِ سرور بیش از حد طول کشید.",
};

// کلیدهایی که خطای فیلد نیستند و نباید به‌عنوان پیام برداشته شوند
const NOT_FIELDS = new Set(["detail", "message", "fieldErrors", "needsBusinessName"]);

const firstString = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.find((item) => typeof item === "string");
    return undefined;
};

/**
 * خطاهای فیلد، یک‌دست‌شده — چه از `fieldErrors`ِ ویوهای خودمان بیایند و چه از
 * ریشهٔ پاسخِ DRF. خروجی همیشه `{نامِ فیلد: پیام}` است.
 */
export const fieldErrorsOf = (err) => {
    const data = err?.data;
    if (!data || typeof data !== "object") return {};

    const result = {};
    if (data.fieldErrors && typeof data.fieldErrors === "object") {
        for (const [name, value] of Object.entries(data.fieldErrors)) {
            const text = firstString(value);
            if (text) result[name] = text;
        }
    }
    // شکلِ سومِ بالا: کلیدِ فیلد مستقیم در ریشه نشسته
    for (const [name, value] of Object.entries(data)) {
        if (NOT_FIELDS.has(name) || name in result) continue;
        const text = firstString(value);
        if (text) result[name] = text;
    }
    return result;
};

/**
 * بهترین پیامی که می‌شود به کاربر نشان داد.
 *
 * @param err خطای پرتاب‌شده از `api/client.js` (دارای `status` و `data`)
 * @param fallback پیامِ پیش‌فرضِ همان صفحه، وقتی سرور چیزِ خواندنی نگفته
 * @param field اگر پر باشد، خطای همین فیلد بر پیامِ عمومی ترجیح داده می‌شود
 */
export const errorMessage = (err, fallback = "عملیات ناموفق بود. لطفاً دوباره تلاش کنید...", field = "") => {
    const data = err?.data;

    if (field) {
        const fieldMessage = fieldErrorsOf(err)[field];
        if (fieldMessage) return fieldMessage;
    }
    if (data && typeof data === "object") {
        if (typeof data.detail === "string") return data.detail;
        if (typeof data.message === "string") return data.message;
        const first = Object.values(fieldErrorsOf(err))[0];
        if (first) return first;
    }
    // بدنه‌ای نبود یا JSON نبود (مثلاً صفحهٔ خطای جنگو یا پراکسی)
    return BY_STATUS[err?.status] ?? fallback;
};
