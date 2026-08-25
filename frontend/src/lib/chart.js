// قراردادهای مشترکِ نمودارهای داشبورد — رنگ، فرمترِ عدد و اندازه‌ها.
//
// چرا یک‌جا؟ در پروژهٔ قدیمی هر نمودار رنگ و فرمترِ خودش را داشت و کم‌کم واگرا
// شدند؛ اینجا «نسیه» در هر چهار نمودار دقیقاً یک رنگ دارد.

// رنگ‌های سری. recharts رنگ را به‌صورت صفتِ SVG می‌گیرد، پس رشتهٔ var() لازم است
// نه کلاسِ تیلویند. این سه در هر دو تم یکی‌اند — رنگ‌های کرومِ نمودار در
// index.css سوییچ می‌شوند (--chart-axis و بقیه).
export const SERIES = {
    debt: "var(--color-var-color-55)",    // نسیه — همان صورتیِ «بدهکار» در جدول‌ها
    paid: "var(--color-var-color-31)",    // وصولی — همان سبزِ «بستانکار»
    balance: "var(--color-var-color-15)", // مانده — اکسنتِ پروژه
    settled: "var(--color-var-color-15)",
    idle: "var(--chart-muted)",
};

// شدتِ سررسید: هرچه بدهی کهنه‌تر، رنگ هشداردهنده‌تر
export const AGING_COLORS = [
    "var(--color-var-color-31)",  // ۰ تا ۳۰ روز — سبز
    "var(--color-var-color-53)",  // ۳۱ تا ۶۰ — کهربایی
    "var(--color-var-color-32)",  // ۶۱ تا ۹۰ — نارنجی
    "var(--color-var-color-28)",  // بیش از ۹۰ — قرمز
];

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export const toFaDigits = (value) => String(value).replace(/\d/g, (d) => FA_DIGITS[d]);

// عددِ کامل با جداکنندهٔ سه‌رقمی و ارقام فارسی
export const faNumber = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("fa-IR").format(n);
};

// عددِ فشرده برای محورها و کارت‌های تنگ: ۲٫۴ م / ۱٫۲ میلیارد.
// روی محورِ نمودار عددِ کاملِ تومان جا نمی‌شود و برچسب‌ها روی هم می‌افتند.
export const faCompact = (value) => {
    const n = Math.abs(Number(value) || 0);
    const sign = Number(value) < 0 ? "−" : "";
    if (n >= 1_000_000_000) return `${sign}${toFaDigits((n / 1_000_000_000).toFixed(1).replace(/\.0$/, ""))} میلیارد`;
    if (n >= 1_000_000) return `${sign}${toFaDigits((n / 1_000_000).toFixed(1).replace(/\.0$/, ""))} م`;
    if (n >= 1_000) return `${sign}${toFaDigits(Math.round(n / 1_000))} هزار`;
    return `${sign}${toFaDigits(n)}`;
};

// درصد — با یک رقم اعشار فقط وقتی لازم است
export const faPercent = (value) => {
    if (value === null || value === undefined) return "—";
    const n = Number(value);
    return `${toFaDigits(Number.isInteger(n) ? n : n.toFixed(1))}٪`;
};

// تاریخِ شمسیِ ردیف از سه ستونِ خودش ساخته می‌شود، نه از تبدیلِ دوبارهٔ created —
// همان مقداری دیده می‌شود که سرور برای فیلتر و جستجو به کار می‌برد
export const faShamsi = ({year, month, day}) =>
    year && month && day
        ? toFaDigits(`${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`)
        : "—";

export const faDate = (iso) =>
    iso ? new Intl.DateTimeFormat("fa-IR", {year: "numeric", month: "2-digit", day: "2-digit"})
        .format(new Date(iso)) : "—";

// ظاهرِ مشترکِ تولتیپِ همهٔ نمودارها
export const TOOLTIP_STYLE = {
    background: "var(--chart-tooltip-bg)",
    border: "1px solid var(--chart-tooltip-border)",
    borderRadius: "12px",
    padding: "8px 12px",
    boxShadow: "0 12px 32px -12px rgba(15, 23, 42, 0.35)",
    color: "var(--chart-tooltip-text)",
    fontSize: "12px",
    direction: "rtl",
};

export const AXIS_TICK = {fill: "var(--chart-axis)", fontSize: 11};
