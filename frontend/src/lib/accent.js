import {ACCENT_CHANGED_EVENT} from "./events.js";

/**
 * رنگِ اصلیِ برنامه (اکسنت).
 *
 * ⚠️ **هیچ کدِ رنگی اینجا نیست و نباید بیاید.** پالت‌ها در `index.css` زیرِ
 * `html[data-accent="..."]` تعریف شده‌اند و همهٔ utilityهای تیلویند از همان
 * متغیرها `var()` می‌خوانند — پس عوض کردنِ یک صفت روی `<html>` دکمه‌ها،
 * نمودارها، اسکرول‌بار، کارت‌های KPI و هالهٔ فوکوسِ ورودی‌ها را **با هم** عوض
 * می‌کند. اگر کدِ رنگ اینجا هم نوشته می‌شد، دو محلِ حقیقت داشتیم که روزی از هم
 * واگرا می‌شدند؛ حتی نمونه‌رنگِ داخلِ منو هم از `--accent-preview-<id>` خوانده
 * می‌شود نه از یک رشتهٔ تکراری.
 */
export const ACCENTS = [
    {id: "blue", label: "آبی"},
    {id: "pink", label: "صورتی"},
    {id: "orange", label: "نارنجی"},
    {id: "green", label: "سبز"},
    {id: "purple", label: "بنفش"},
];

export const DEFAULT_ACCENT = "blue";

const STORAGE_KEY = "accent";

const isKnown = (id) => ACCENTS.some((accent) => accent.id === id);

/** رنگِ ذخیره‌شده. مقدارِ ناشناخته (پالتی که روزی حذف شود) به پیش‌فرض برمی‌گردد. */
export const getAccent = () => {
    if (typeof window === "undefined") return DEFAULT_ACCENT;
    const saved = localStorage.getItem(STORAGE_KEY);
    return isKnown(saved) ? saved : DEFAULT_ACCENT;
};

/** اعمال + ذخیره + خبر دادن — همان الگویی که `ThemeSwitcher` برای تم دارد. */
export const setAccent = (id) => {
    const next = isKnown(id) ? id : DEFAULT_ACCENT;
    document.documentElement.dataset.accent = next;
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(ACCENT_CHANGED_EVENT));
    return next;
};

// ⚠️ **نامِ کهنه در localStorage همین‌جا پاک می‌شود، نه وقتی کاربر منو را باز کند.**
// اسکریپتِ زودهنگامِ `index.html` فهرستِ پالت‌ها را نمی‌شناسد — و نباید بشناسد،
// چون فهرست نباید دو جا نوشته شود — پس هرچه در localStorage باشد را همان‌طور روی
// `<html>` می‌نشاند. اگر کسی پالتی را انتخاب کرده باشد که بعداً حذف شده، صفت همان
// نامِ حذف‌شده می‌ماند در حالی که `getAccent` آبی برمی‌گرداند و منو آبی را تیک
// می‌زند. صفحه خراب نمی‌شود (برای آن نام بلاکی وجود ندارد و همه‌چیز آبی رندر
// می‌شود) ولی دو محلِ حقیقت واگرا می‌مانند، و اگر روزی پالتی با همان نام برگردد
// ناگهان فعال می‌شود. فقط مقدارِ **ناشناخته** اصلاح می‌شود؛ مهمانِ تازه که چیزی
// ذخیره نکرده دست نمی‌خورد.
if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null && !isKnown(saved)) setAccent(DEFAULT_ACCENT);
}
