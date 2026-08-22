// شکلِ داده و تبدیلِ آن به بدنهٔ درخواستِ جستجوی تاریخ.
// جدا از کامپوننت‌ها نگه داشته می‌شود چون قاعدهٔ react-refresh اجازه نمی‌دهد یک
// فایل هم کامپوننت صادر کند هم تابع — و صادرکردنشان لازم است تا پنل و کشو یک
// تعریفِ مشترک داشته باشند، نه دو نسخهٔ واگرا.

export const MODES = {SPECIFIC: "specific", RANGE: "range", CUSTOM: "custom"};

export const MODE_ITEMS = [
    {key: MODES.SPECIFIC, label: "مشخص"},
    {key: MODES.RANGE, label: "بازه"},
    {key: MODES.CUSTOM, label: "نامنظم"},
];

export const MONTH_OPTIONS = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
].map((label, index) => ({value: index + 1, label}));

// ارقامِ روز فارسی نمایش داده می‌شوند ولی مقدارشان انگلیسی می‌ماند
export const DAY_OPTIONS = Array.from({length: 31}, (_, i) => ({
    value: i + 1,
    label: new Intl.NumberFormat("fa-IR").format(i + 1),
}));

export const emptyField = () => ({mode: MODES.SPECIFIC, specific: "", from: "", to: "", custom: [""]});

// شکلی که بک‌اند انتظار دارد (home/services.py). جزءِ خالی اصلاً فرستاده نمی‌شود.
export const fieldToPayload = (field) => {
    if (field.mode === MODES.SPECIFIC) return field.specific ? {specific: field.specific} : null;
    // یک‌سرِ خالیِ بازه هم معتبر است: سرور آن را «از این به بعد» یا «تا اینجا» می‌خواند
    if (field.mode === MODES.RANGE) return field.from || field.to ? {range: [field.from, field.to]} : null;
    const values = field.custom.map((value) => String(value).trim()).filter(Boolean);
    return values.length ? {custom: values} : null;
};

export const isFieldFilled = (field) => fieldToPayload(field) !== null;

export const emptySearchState = () => ({year: emptyField(), month: emptyField(), day: emptyField()});

// بدنهٔ کاملِ جستجو؛ اگر هیچ جزئی پر نباشد null برمی‌گردد
export const searchStateToPayload = (state) => {
    const payload = {};
    for (const key of ["year", "month", "day"]) {
        const part = fieldToPayload(state[key]);
        if (part) payload[key] = part;
    }
    return Object.keys(payload).length ? payload : null;
};
