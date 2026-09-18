import {createElement} from "react";
import {flushSync} from "react-dom";
import {createRoot} from "react-dom/client";
import LogoIcon from "../components/common/LogoIcon.jsx";
import {ACCENT_CHANGED_EVENT} from "./events.js";

/**
 * آیکونِ تبِ مرورگر — همان لوگوی برنامه، به رنگِ پالتِ فعلی.
 *
 * ⚠️ **فایلِ `public/favicon.svg` نمی‌تواند خودش رنگ عوض کند.** favicon سندِ جدای
 * خودش است و به متغیرهای CSSِ صفحه دسترسی ندارد، پس رنگ‌هایش داخلِ فایل فریز
 * می‌مانند — لوگوی داخلِ برنامه نارنجی می‌شد و تب آبی می‌ماند. اینجا SVG با
 * رنگ‌های **حل‌شده** ساخته و به‌صورتِ data URI جایگزینِ آن فایل می‌شود. خودِ فایل
 * فقط تا لحظهٔ اجرای جاوااسکریپت دیده می‌شود (نسخهٔ آبی، که پیش‌فرض هم هست).
 *
 * ⚠️ **شکل از خودِ `LogoIcon` می‌آید، نه از یک کپی.** یک‌بار در یک ریشهٔ جدا و
 * بیرون از صفحه رندر و متنش خوانده می‌شود؛ پس اگر روزی لوگو عوض شد، favicon خودش
 * همان را می‌گیرد. رنگ‌ها هم از همان متغیرهای `--accent-logo-*` خوانده می‌شوند که
 * لوگوی داخلِ برنامه می‌خواند — طبقِ قاعدهٔ پروژه، هیچ کدِ رنگی اینجا نیست.
 */

const LINK_SELECTOR = 'link[rel="icon"]';
const LOGO_VARS = /var\(\s*(--accent-logo-[a-z]+)\s*\)/g;

let template = null;
let lastHref = null;

// متنِ SVGِ لوگو با همان `var(--accent-logo-*)`های دست‌نخورده. فقط یک‌بار ساخته
// می‌شود؛ هر بار فقط رنگ‌ها جایگزین می‌شوند.
const logoTemplate = () => {
    if (template) return template;
    const host = document.createElement("div");
    const root = createRoot(host);
    flushSync(() => root.render(createElement(LogoIcon)));
    template = host.innerHTML;
    root.unmount();
    // بدونِ xmlns، SVG به‌عنوانِ تصویرِ مستقل رندر نمی‌شود. LogoIcon خودش دارد؛ این
    // فقط محافظ است تا اگر روزی از آنجا برداشته شد، تب بی‌آیکون نماند.
    if (!template.includes("xmlns=")) {
        template = template.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    return template;
};

export const updateFavicon = () => {
    const style = getComputedStyle(document.documentElement);
    let missing = false;
    const svg = logoTemplate().replace(LOGO_VARS, (_, name) => {
        const value = style.getPropertyValue(name).trim();
        if (!value) missing = true;
        return value;
    });
    // متغیرِ تعریف‌نشده یعنی رنگِ خالی و لوگوی سیاه؛ بهتر است همان قبلی بماند
    if (missing) return;

    // ⚠️ `encodeURIComponent` لازم است نه تزئینی: `#` در کدِ رنگ، داخلِ data URI
    // شروعِ fragment تلقی می‌شود و بقیهٔ SVG را می‌بُرد.
    const href = "data:image/svg+xml," + encodeURIComponent(svg);
    if (href === lastHref) return;
    lastHref = href;

    let link = document.querySelector(LINK_SELECTOR);
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }
    link.type = "image/svg+xml";
    link.href = href;
};

/** یک‌بار هنگامِ شروع، و بعد با هر تغییرِ رنگ. */
export const initFavicon = () => {
    updateFavicon();
    window.addEventListener(ACCENT_CHANGED_EVENT, updateFavicon);
};
