import {OverlayScrollbarsComponent} from "overlayscrollbars-react";

/**
 * ناحیهٔ اسکرول‌دار با اسکرول‌بارِ سفارشی — همان کتابخانهٔ OverlayScrollbars که در
 * پروژهٔ CustomerManagement به کار رفته بود، با همان پراپ‌ها.
 *
 * چرا به‌جای `overflow-auto`؟ اسکرول‌بارِ بومیِ مرورگر نه رنگ می‌گیرد نه در ویندوز
 * و لینوکس یک شکل است، و در ناحیه‌های باریک عرضِ محتوا را می‌خورد. این کتابخانه
 * اسکرول‌بار را روی محتوا شناور می‌کند.
 *
 * تفاوتِ پیاده‌سازی با پروژهٔ قدیمی: آنجا هر نمونه یک تگ `<style>` کاملِ اختصاصی
 * تولید می‌کرد که با هر رندر دوباره پارس می‌شد. اینجا ظاهر یک‌بار در `index.css`
 * تعریف شده (تمِ `os-theme-app`) و هر نمونه فقط متغیرهای CSS را عوض می‌کند.
 *
 * نکتهٔ مهم هنگام استفاده: کتابخانه بینِ این عنصر و فرزندانش عنصرِ viewport را
 * می‌گذارد، پس کلاس‌های چیدمانِ محتوا (`flex`، `gap`، `p-*`) باید روی یک div
 * داخلی بروند، نه روی خودِ ScrollContainer. کلاس‌های اندازه (`flex-1`،
 * `min-h-0`، `max-h-*`، `h-full`) روی خودِ آن می‌مانند.
 */
const ScrollContainer = ({
    children,
    className = "",
    // سمتِ اسکرول‌بارِ عمودی. پیش‌فرض چپ است: در RTL چپ «انتهای خط» است و روی
    // شروعِ متن نمی‌افتد — همان کاری که خودِ مرورگر در RTL می‌کند. با "right"
    // جابه‌جا می‌شود (قاعده‌اش در index.css).
    position = "left",
    // رنگ از همان توکنِ پالتِ پروژه می‌آید نه یک rgba دستی، تا اگر اکسنت عوض شد
    // اسکرول‌بار هم با آن برود
    color = "var(--color-var-color-15)",
    opacity = 0.7,
    hoverOpacity = 1,
    width = 4,          // ضخامتِ دستهٔ اسکرول‌بار به پیکسل
    maxHeight = 200,    // بیشینهٔ درازای دسته
    // "leave" یعنی اسکرول‌بار در حالت عادی پنهان است و به‌محضِ رفتنِ موس روی ناحیه
    // ظاهر می‌شود و با بیرون رفتنِ موس دوباره می‌رود. "move" با هر تکانِ موس نشان
    // می‌دهد و بعد از تاخیر محو می‌کند، "never" همیشه نمایش می‌دهد.
    autoHide = "leave",
    autoHideDelay = 500,
    overflowX = "scroll",
    overflowY = "scroll",
    // عنصرِ واقعیِ اسکرول‌دار درونِ کتابخانه است نه خودِ این عنصر؛ هر جا کد لازم
    // دارد دستی اسکرول کند (مثل «برو به آخرِ گفتگو») این ref را بگیرد.
    viewportRef,
    style,
    ...restProps
}) => (
    <OverlayScrollbarsComponent
        className={`${className}`}
        data-scrollbar-position={position}
        events={{
            initialized: (instance) => {
                if (viewportRef) viewportRef.current = instance.elements().viewport;
            },
            destroyed: () => {
                if (viewportRef) viewportRef.current = null;
            },
        }}
        style={{
            "--scroll-handle-color": color,
            "--scroll-handle-opacity": opacity,
            "--scroll-handle-hover-opacity": hoverOpacity,
            // پدینگِ نوار ۳ پیکسل در هر طرف است، پس اندازهٔ کلِ نوار = ضخامتِ دسته + ۶
            "--scroll-size": `${Number(width) + 6}px`,
            "--scroll-handle-max": `${maxHeight}px`,
            ...style,
        }}
        options={{
            scrollbars: {theme: "os-theme-app", autoHide, autoHideDelay, clickScroll: true},
            overflow: {x: overflowX, y: overflowY},
        }}
        {...restProps}
    >
        {children}
    </OverlayScrollbarsComponent>
);

export default ScrollContainer;
