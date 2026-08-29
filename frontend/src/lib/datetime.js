// تاریخ و زمان به فارسی.
//
// هیچ کتابخانهٔ شمسی لازم نیست: `Intl` با لوکالِ `fa-IR` خودش تقویمِ هجریِ شمسی
// می‌دهد. همان کاری که فوتر و جدولِ مشتریان از قبل می‌کردند — یک وابستگیِ تازه
// برای چیزی که مرورگر بلد است، فقط حجمِ باندل را بالا می‌برد.

const FULL = new Intl.DateTimeFormat("fa-IR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
});

const RELATIVE = new Intl.RelativeTimeFormat("fa", {numeric: "auto"});

// از کوچک به بزرگ. هر پله وقتی انتخاب می‌شود که فاصله از پلهٔ بعدی کمتر باشد.
const STEPS = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.34524],
    ["month", 12],
    ["year", Infinity],
];

/** تاریخ و ساعتِ کاملِ شمسی — «۹ شهریور ۱۴۰۵، ۰۰:۴۷» */
export const fullDateTime = (iso) => (iso ? FULL.format(new Date(iso)) : "");

/**
 * فاصلهٔ نسبی — «هم‌اکنون»، «۲ دقیقه پیش»، «دیروز».
 *
 * ⚠️ زیرِ یک دقیقه عمداً «هم‌اکنون» می‌شود نه «۳۰ ثانیه پیش»: پیامی که همین
 * حالا فرستاده شده، شمارشِ ثانیه‌اش هم بی‌فایده است هم با هر رندر عوض می‌شود.
 */
export function relativeTime(iso) {
    if (!iso) return "";
    const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
    if (Math.abs(seconds) < 60) return "هم‌اکنون";

    let value = seconds;
    for (const [unit, span] of STEPS) {
        if (Math.abs(value) < span) return RELATIVE.format(Math.round(value), unit);
        value /= span;
    }
    return FULL.format(new Date(iso));
}
