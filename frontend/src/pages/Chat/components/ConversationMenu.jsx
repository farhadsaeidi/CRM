import {useCallback, useRef} from "react";
import {useDismiss} from "../../../lib/useDismiss.js";

// ارتفاعِ تقریبیِ هر ردیف + پدینگِ پنل. فقط برای تصمیمِ «بالا یا پایین باز شود»
// به کار می‌رود، پس تقریب کافی است — ولی اگر ردیف‌ها بلندتر شدند اینجا هم
// به‌روز شود، وگرنه منوی نزدیکِ کفِ صفحه بیرون می‌زند.
const ROW_HEIGHT = 38;
const PANEL_PADDING = 10;
const GAP = 6;

/**
 * منوی سه‌نقطهٔ هر گفتگو.
 *
 * ⚠️ **`fixed` است و بیرونِ ناحیهٔ اسکرول رندر می‌شود، نه کنارِ دکمه‌اش.** فهرستِ
 * گفتگوها داخلِ `ScrollContainer` است و یک پنلِ `absolute` را viewportِ کتابخانه
 * می‌بُرد — همان دلیلی که تولتیپِ دکمهٔ بازگشت هم شناور شد. پس مختصات از
 * `getBoundingClientRect()` می‌آید و پنل روی مختصاتِ صفحه می‌نشیند.
 *
 * ⚠️ و چون `fixed` است، با اسکرولِ فهرست از دکمه‌اش جدا می‌افتد. برای همین
 * `useDismiss` اینجا با `onScroll` صدا زده می‌شود.
 */
const ConversationMenu = ({items, rect, onClose}) => {
    const boxRef = useRef(null);
    // ⚠️ `onClose` باید مرجعِ پایدار داشته باشد وگرنه افکتِ داخلِ هوک با هر
    // رندرِ والد لیسنرها را برمی‌دارد و دوباره می‌گذارد.
    const close = useCallback(() => onClose(), [onClose]);
    useDismiss(Boolean(rect), close, boxRef, {onScroll: true});

    if (!rect) return null;

    // اگر زیرِ دکمه جا نیست، رو به بالا باز می‌شود. با `bottom` لنگر می‌اندازد
    // تا ارتفاعِ واقعیِ پنل خودش را جا کند و به تخمینِ بالا وابسته نماند.
    const height = items.length * ROW_HEIGHT + PANEL_PADDING;
    const below = rect.bottom + GAP + height <= window.innerHeight;
    const position = below
        ? {top: rect.bottom + GAP}
        : {bottom: window.innerHeight - rect.top + GAP};

    return (
        <div ref={boxRef} role="menu" aria-label="عملیات گفتگو"
             className="fixed z-[1000] w-40 p-1 rounded-xl
                        bg-var-color-00 dark:bg-var-color-36
                        border border-var-color-02 dark:border-var-color-38
                        shadow-[0_8px_28px_rgba(0,0,0,0.12)]
                        dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
             style={{...position, left: rect.left, animation: "crm-rise .16s ease-out both"}}>
            {items.map(({key, label, icon: Icon, danger = false, onSelect}) => (
                <button key={key} type="button" role="menuitem"
                        onClick={() => {
                            onClose();
                            onSelect();
                        }}
                        className={`w-full px-2.5 py-2 rounded-lg flex items-center gap-2
                                    text-[12.5px] cursor-pointer transition-colors
                                    hover:bg-var-color-01 dark:hover:bg-var-color-40 ${
                            danger
                                ? "text-var-color-28"
                                : "text-var-color-06 dark:text-var-color-01"}`}>
                    {/* آیکون **اول** در DOM یعنی راست‌ترین در RTL — همان چیدمانی
                        که منوهای مرجع دارند: اول نشانه، بعد عنوان. */}
                    <Icon className="shrink-0 w-4 h-4"/>
                    {label}
                </button>
            ))}
        </div>
    );
};

export default ConversationMenu;
