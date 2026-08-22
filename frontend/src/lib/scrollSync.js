// جای دستهٔ اسکرول را خودمان می‌نویسیم — نه با متغیر، با پیکسل.
//
// چرا، با اینکه کارِ خودِ کتابخانه است: overlayscrollbars برای جابه‌جا کردنِ دسته
// دو مسیر دارد و هر دو در عمل شکستند.
//
// ۱) اگر `ScrollTimeline` باشد (کروم)، حرکت را با انیمیشنِ Web Animations اداره
//    می‌کند. آن انیمیشن هنگام بازساختِ اسکرول‌بارها cancel می‌شود ولی چون
//    کی‌فریمِ کش‌شده عوض نشده دوباره ساخته نمی‌شود، و دسته بالا قفل می‌ماند.
// ۲) وگرنه (فایرفاکس) `--os-scroll-percent` را می‌نویسد و بقیه‌اش با CSS است:
//    `translateY(calc(pct * 100cqh + pct * -100%))`. این زنجیره به `@property`،
//    واحدهای container query و `container-type: size` وابسته است و در فایرفاکس
//    دسته را تکان نمی‌دهد.
//
// پس به‌جای درست کردنِ هر کدام جداگانه، خروجیِ نهایی را خودمان می‌نویسیم:
// جابه‌جایی = درصدِ اسکرول × (ارتفاعِ ریل − ارتفاعِ دسته). همان فرمولی که خودِ
// کتابخانه هم استفاده می‌کند، ولی بدون هیچ وابستگی به قابلیت‌های تازهٔ CSS.
//
// `top: 0` هم صریح ست می‌شود: در مرورگرهای امروزی قاعدهٔ کتابخانه `top: auto`
// می‌دهد و فرقی نمی‌کند، ولی در شاخهٔ قدیمی‌ترش `top` هم با درصد جابه‌جا می‌شود
// و بدون این، جابه‌جایی دوبار حساب می‌شد.
//
// در حالتی که انیمیشنِ کتابخانه زنده و سالم است (کرومِ بدون باگ)، انیمیشن روی
// `transform` بر استایلِ درون‌خطی می‌چربد و این کد بی‌اثر است — یعنی جایی را
// خراب نمی‌کند، فقط حفره‌ها را پر می‌کند.
export const syncScrollHandles = (instance) => {
    const {viewport, scrollbarVertical, scrollbarHorizontal} = instance.elements();
    if (!viewport) return;

    const maxY = viewport.scrollHeight - viewport.clientHeight;
    const maxX = viewport.scrollWidth - viewport.clientWidth;
    const percentY = maxY > 0 ? viewport.scrollTop / maxY : 0;
    // در RTL مرورگر scrollLeft را منفی می‌دهد؛ جهت را کتابخانه با
    // `--os-scroll-direction` اعمال می‌کند، پس اینجا فقط اندازه لازم است
    const percentX = maxX > 0 ? Math.abs(viewport.scrollLeft) / maxX : 0;

    // متغیر را هم می‌نویسیم تا وضعیتِ داخلیِ کتابخانه با واقعیت هم‌راست بماند
    scrollbarVertical?.scrollbar?.style.setProperty("--os-scroll-percent", String(percentY));
    scrollbarHorizontal?.scrollbar?.style.setProperty("--os-scroll-percent", String(percentX));

    // فقط محورِ عمودی صریح نوشته می‌شود. افقی در RTL جهتش برعکس است و منطقش را
    // کتابخانه با `--os-scroll-direction` دارد؛ دست بردن در آن سود کمی دارد و
    // ریسکِ وارونه شدن زیاد.
    const track = scrollbarVertical?.track;
    const handle = scrollbarVertical?.handle;
    if (!track || !handle) return;

    // offsetHeight نه getBoundingClientRect: دومی ترنسفورمِ خودمان را هم حساب
    // می‌کند و اندازه‌گیری به خودش ارجاع پیدا می‌کند
    const travel = track.clientHeight - handle.offsetHeight;
    handle.style.top = "0";
    handle.style.transform = `translateY(${Math.max(0, travel) * percentY}px)`;
};
