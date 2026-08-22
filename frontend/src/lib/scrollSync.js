// موقعیتِ دستهٔ اسکرول را خودمان می‌نویسیم.
//
// چرا، با اینکه کارِ خودِ کتابخانه است: overlayscrollbars دو مسیر برای جابه‌جا
// کردنِ دسته دارد و یکی‌شان شکننده است. اگر `ScrollTimeline` در دسترس باشد
// حرکت را با یک انیمیشنِ Web Animations اداره می‌کند و `--os-scroll-percent` را
// اصلاً نمی‌نویسد؛ آن انیمیشن هنگام بازساختِ اسکرول‌بارها لغو می‌شود ولی چون
// کی‌فریمِ کش‌شده عوض نشده دوباره ساخته نمی‌شود، و دسته بالای ناحیه قفل می‌ماند.
//
// `scrollTimelineGuard.js` جلوی آن مسیر را می‌گیرد، ولی آن محافظ به ترتیبِ
// ارزیابیِ ماژول‌ها وابسته است و همین باگ چند بار برگشته. این تابع لایهٔ دومِ
// مستقلی است: در هر سه حالت درست کار می‌کند —
//   • مسیرِ CSS سالم  → مقدارِ ما همان چیزی است که خودش می‌نویسد، بی‌اثر
//   • انیمیشن زنده    → انیمیشن روی transform برنده است، بی‌اثر
//   • انیمیشن لغو‌شده → قاعدهٔ CSS دوباره فعال می‌شود و همین مقدار حرکتش می‌دهد
//
// یعنی موقعیتِ دسته دیگر به داخلی‌های کتابخانه گره نخورده است.
export const syncScrollHandles = (instance) => {
    const {viewport, scrollbarVertical, scrollbarHorizontal} = instance.elements();
    if (!viewport) return;

    const write = (bar, value) =>
        bar?.scrollbar?.style.setProperty("--os-scroll-percent", String(value));

    const maxY = viewport.scrollHeight - viewport.clientHeight;
    const maxX = viewport.scrollWidth - viewport.clientWidth;
    write(scrollbarVertical, maxY > 0 ? viewport.scrollTop / maxY : 0);
    // در RTL مرورگر scrollLeft را منفی می‌دهد؛ جهت را خودِ کتابخانه با
    // `--os-scroll-direction` اعمال می‌کند، پس اینجا فقط اندازه لازم است
    write(scrollbarHorizontal, maxX > 0 ? Math.abs(viewport.scrollLeft) / maxX : 0);
};
