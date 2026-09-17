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
    {id: "indigo", label: "نیلی"},
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
