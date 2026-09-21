import {faNumber, faPercent, toFaDigits} from "../../../../lib/chart.js";
import {ALL_TRANSACTIONS_PATH, CUSTOMERS_PATH, HOME_PATH, customerLedgerPath} from "../../../../lib/paths.js";

// قالب‌بندیِ ویجت‌های پاسخِ دستیار. سرور عددِ خام می‌فرستد (`chat/widgets.py`) و
// شکلِ نمایش — ارقامِ فارسی، جداکننده، «تومان» — فقط اینجا ساخته می‌شود؛ همان
// فرمترهای نمودارهای داشبورد، تا یک عدد در دو جای برنامه دو شکل نداشته باشد.

export const formatValue = (value, format) => {
    if (value === null || value === undefined || value === "") return "—";
    switch (format) {
        case "money":
        case "count":
            return faNumber(value);
        case "percent":
            return faPercent(value);
        case "days":
            return Number(value) === 0 ? "امروز" : `${faNumber(value)} روز پیش`;
        default:
            return toFaDigits(value);
    }
};

// واحدِ پیش‌فرضِ هر قالب. مبلغ همیشه تومان است، پس سرور لازم نیست هر بار بگوید.
export const unitOf = (format, unit) => unit ?? (format === "money" ? "تومان" : "");

// گریدِ کاشی‌های عدد — مشترکِ ویجتِ ثابت و `KpiGrid`ِ رابطی که مدل می‌سازد
export const TILE_GRID = "grid grid-cols-2 sm:grid-cols-3 gap-2 px-2.5 pb-2.5";

// ⚠️ رنگِ وضعیت‌ها **معنا** دارد و از پالت پیروی نمی‌کند — همان جفت‌رنگ‌های
// جدولِ مشتریان: بدهکار صورتی، بستانکار سبز، بی‌حساب کهربایی.
export const TONE_TEXT = {
    debt: "text-var-color-55",
    credit: "text-var-color-31",
    zero: "text-var-color-53",
};

export const BADGE_CLASS = {
    debt: "text-var-color-55 bg-var-color-56",
    credit: "text-var-color-31 bg-var-color-47",
    zero: "text-var-color-53 bg-var-color-54",
    // برچسبِ بی‌رنگ، برای ماندهٔ کلِ دفتر: آنجا رنگِ عدد عمداً خنثی است و وضعیت
    // را فقط متن می‌گوید — همان تصمیمِ کاشیِ «ماندهٔ کل دفتر» در داشبورد
    none: "text-var-color-05 dark:text-var-color-39 bg-var-color-02 dark:bg-var-color-38",
};

// نوارِ نسبیِ زیرِ عدد: ریلِ کم‌رنگ و پرِ هم‌رنگِ همان وضعیت
export const BAR_CLASS = {
    debt: {track: "bg-var-color-56", fill: "bg-var-color-55"},
    credit: {track: "bg-var-color-47", fill: "bg-var-color-31"},
};

// وضعیتِ متنیِ مشتری («بدهکار» و…) همان‌طور که ابزار داده، به تُنِ رنگ
export const statusTone = (text = "") => {
    if (text.includes("بدهکار")) return "debt";
    if (text.includes("بستانکار")) return "credit";
    return "zero";
};

// ⚠️ سرور مقصدِ **معنایی** می‌فرستد نه آدرس — مسیرهای فرانت فقط در `lib/paths.js`
// می‌مانند. مقصدِ ناشناخته یعنی لینکی نشان داده نشود، نه لینکی شکسته.
export const linkPath = (link) => {
    switch (link?.target) {
        case "dashboard":
            return HOME_PATH;
        case "customers":
            return CUSTOMERS_PATH;
        case "transactions":
            return ALL_TRANSACTIONS_PATH;
        case "ledger":
            return link.customer_id ? customerLedgerPath(link.customer_id) : null;
        default:
            return null;
    }
};
