import {useMemo} from "react";
import {OverlayScrollbarsComponent} from "overlayscrollbars-react";
import {syncScrollHandles} from "../../lib/scrollSync.js";

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
    width = 3,          // ضخامتِ دستهٔ اسکرول‌بار به پیکسل
    maxHeight = 400,    // بیشینهٔ درازای دسته — عملاً یعنی بی‌سقف
    // "move": با تکان خوردنِ موس داخلِ ناحیه ظاهر می‌شود و اگر موس بی‌حرکت بماند
    // بعد از autoHideDelay محو می‌شود؛ تکانِ دوباره برش می‌گرداند. ("leave" فقط با
    // بیرون رفتنِ موس پنهان می‌کرد و تا وقتی نشانگر روی ناحیه بود می‌ماند.)
    autoHide = "move",
    autoHideDelay = 800,
    overflowX = "scroll",
    overflowY = "scroll",
    // عنصرِ واقعیِ اسکرول‌دار درونِ کتابخانه است نه خودِ این عنصر؛ هر جا کد لازم
    // دارد دستی اسکرول کند (مثل «برو به آخرِ گفتگو») این ref را بگیرد.
    viewportRef,
    style,
    ...restProps
}) => {
    // ⚠️ options و events باید مرجعِ پایدار داشته باشند.
    //
    // ‏`overlayscrollbars-react` این دو را دقیقاً به‌عنوان وابستگیِ افکت می‌گیرد و با
    // هر تغییرِ مرجع، `instance.options(o, true)` و `instance.on(t, true)` را صدا
    // می‌زند — یعنی پیکربندیِ کاملِ نمونه از نو ساخته می‌شود. با آبجکتِ درجا (که هر
    // رندر تازه است) این کار در هر رندرِ والد تکرار می‌شد.
    //
    // فقط کندی نبود: کتابخانه حرکتِ دستهٔ اسکرول را با یک انیمیشنِ ScrollTimeline
    // اداره می‌کند و در بازسازی، انیمیشنِ قبلی را cancel می‌کند ولی چون کی‌فریم‌ها
    // عوض نشده‌اند از ساختِ دوباره صرف‌نظر می‌کند. نتیجه: دسته روی translateY(0)
    // قفل می‌شد و با اسکرول جابه‌جا نمی‌شد.
    const options = useMemo(() => ({
        scrollbars: {theme: "os-theme-app", autoHide, autoHideDelay, clickScroll: true},
        overflow: {x: overflowX, y: overflowY},
    }), [autoHide, autoHideDelay, overflowX, overflowY]);

    const events = useMemo(() => ({
        initialized: (instance) => {
            if (viewportRef) viewportRef.current = instance.elements().viewport;
            syncScrollHandles(instance);
        },
        // موقعیتِ دسته را خودمان می‌نویسیم تا به مسیرِ داخلیِ کتابخانه وابسته نباشد
        // — دلیلِ کامل در lib/scrollSync.js
        scroll: syncScrollHandles,
        updated: syncScrollHandles,
        destroyed: () => {
            if (viewportRef) viewportRef.current = null;
        },
    }), [viewportRef]);

    const styles = useMemo(() => ({
        "--scroll-handle-color": color,
        "--scroll-handle-opacity": opacity,
        "--scroll-handle-hover-opacity": hoverOpacity,
        // پدینگِ نوار ۳ پیکسل در هر طرف است، پس اندازهٔ کلِ نوار = ضخامتِ دسته + ۶
        "--scroll-size": `${Number(width) + 6}px`,
        "--scroll-handle-max": `${maxHeight}px`,
        ...style,
    }), [color, opacity, hoverOpacity, width, maxHeight, style]);

    return (
        <OverlayScrollbarsComponent
            className={className}
            data-scrollbar-position={position}
            events={events}
            style={styles}
            options={options}
            {...restProps}
        >
            {children}
        </OverlayScrollbarsComponent>
    );
};

export default ScrollContainer;
