import {useRef, useState} from "react";

// محدودهٔ عرضِ سایدبار — مبنا: سایدبارِ قابلِ‌جابجاییِ تلگرام دسکتاپ.
// کمینه ۲۶۰ تا عنوان هر ردیف بدون شکستگی جا شود؛
// بیشینه ۴۲۰ تا حتی روی باریک‌ترین دسکتاپ (۷۶۸px) ستونِ اصلی زیر ۳۳۰px نرود.
const MIN_WIDTH = 260;
const MAX_WIDTH = 420;

// پیش‌فرض طوری حساب شده که لبهٔ چپِ سایدبار دقیقاً روی لبهٔ چپِ کادرِ جستجوی فوتر بیفتد:
// فاصلهٔ آن کادر از لبهٔ راستِ صفحه = mr-3(۱۲) + دکمه(۴۵) + gap-1.75(۷) + w-67(۲۶۸) = ۳۳۲
// و خودِ سایدبار ۱۶ پیکسل تورفتگی دارد (p-4 در RootLayout) → ۳۳۲ − ۱۶ = ۳۱۶
// اگر عرضِ کادرِ جستجو یا چیدمانِ فوتر عوض شد، این عدد هم باید به‌روز شود.
const DEFAULT_WIDTH = 316;

const clamp = (n) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(n)));

const Sidebar = ({hiddenOnMobile = false, className = "", children}) => {
    // با هر بار لود یا رفرش از پیش‌فرضِ هم‌راستا شروع می‌کند (عرضِ کشیده‌شده ذخیره نمی‌شود)
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const drag = useRef(null);   // {startX, startWidth} — فقط حین کشیدن مقدار دارد

    // صفحه RTL است و سایدبار سمت راست می‌نشیند؛ پس کشیدنِ دستگیره به چپ یعنی عریض‌تر شدن
    const pointerDownHandler = (e) => {
        e.preventDefault();
        drag.current = {startX: e.clientX, startWidth: width};
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.focus();
        // تا وقتی می‌کشیم، متنِ بقیهٔ صفحه انتخاب نشود و نشانگر همه‌جا col-resize بماند
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
    };

    const pointerMoveHandler = (e) => {
        if (!drag.current) return;
        setWidth(clamp(drag.current.startWidth + (drag.current.startX - e.clientX)));
    };

    const endDragHandler = () => {
        if (!drag.current) return;
        drag.current = null;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
    };

    // جابجایی با کیبورد — در RTL چپ = عریض‌تر. با Shift گام بزرگ‌تر، با Home بازگشت به پیش‌فرض
    const keyDownHandler = (e) => {
        const step = e.shiftKey ? 32 : 8;
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            setWidth((w) => clamp(w + step));
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setWidth((w) => clamp(w - step));
        } else if (e.key === "Home") {
            e.preventDefault();
            setWidth(DEFAULT_WIDTH);
        }
    };

    return (
        <aside style={{"--sidebar-w": `${width}px`}}
               className={`relative ${hiddenOnMobile ? "hidden md:flex" : "flex"} w-full md:w-(--sidebar-w) shrink-0 flex-col overflow-hidden rounded-[18px] bg-var-color-00 dark:bg-var-color-36 border border-var-color-02 dark:border-var-color-38 ${className}`}>
            {children}
            {/* دستگیرهٔ تغییرِ عرض روی لبهٔ چپ (مرزِ سایدبار با ستونِ اصلی).
                در موبایل که عرض تمام‌صفحه است پنهان می‌شود. */}
            <div role="separator" aria-orientation="vertical" aria-label="تغییر عرض سایدبار"
                 aria-valuenow={width} aria-valuemin={MIN_WIDTH} aria-valuemax={MAX_WIDTH} tabIndex={0}
                 onPointerDown={pointerDownHandler} onPointerMove={pointerMoveHandler}
                 onPointerUp={endDragHandler} onPointerCancel={endDragHandler}
                 onKeyDown={keyDownHandler} onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
                 className="hidden md:block absolute inset-y-0 left-0 w-2.5 cursor-col-resize touch-none outline-none"/>
        </aside>
    );
};

export default Sidebar;
