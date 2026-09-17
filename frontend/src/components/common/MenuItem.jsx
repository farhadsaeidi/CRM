import {MENU_ROW_ACTIVE, MENU_ROW_HOVER, MENU_ROW_HOVER_QUIET} from "../../lib/menuPalette.js";

// آیتمِ منو — همان الگوی پروژهٔ CustomerManagement. رنگ‌بندی‌اش دیگر به `toggle`
// بستگی ندارد و از `lib/menuPalette.js` می‌آید تا همهٔ منوها یک‌شکل باشند؛
// `toggle` فقط می‌گوید آیتم مالِ کدام منوست و فاصلهٔ عمودی‌اش چقدر باشد.
//
// `leading` و `trailing` برای ردیف‌هایی است که چیزی بیش از آیکون و متن دارند —
// تیک و نمونه‌رنگِ کشوی انتخاب رنگ، یا فلشِ ردیفی که کشو را باز می‌کند. بودنشان
// یعنی آن ردیف‌ها هم از همین‌جا رنگ می‌گیرند و کپیِ دومی از این کلاس‌ها ساخته
// نمی‌شود.
export default function MenuItem({
    id, icon: Icon, text, active, toggle, onClick, leading, trailing, expanded, selected,
    quietHover = false,
}) {
    const palette = active
        ? MENU_ROW_ACTIVE
        : `text-var-color-08 dark:text-var-color-46 ${
            quietHover ? MENU_ROW_HOVER_QUIET : MENU_ROW_HOVER}`;

    // «فعال» معمولاً یعنی کلیکِ بی‌اثر، ولی ردیفی که کشو باز و بسته می‌کند همیشه
    // کلیک‌پذیر است — آنجا فعال یعنی «باز»
    const isNoop = active && expanded === undefined;

    return (
        <button
            type="button"
            id={id}
            onClick={onClick}
            aria-expanded={expanded}
            role={selected === undefined ? undefined : "option"}
            aria-selected={selected}
            className={`w-full flex flex-row justify-start items-center gap-2.5 py-1.5 px-2.5 rounded-[10px] ${
                toggle === "transactionsFilter" ? "my-0.75" : "my-px"
            } transition-all duration-200 ease-in-out ${
                isNoop ? "cursor-default" : "cursor-pointer"
            } bg-transparent border border-transparent font-IRANSansXFaNumRegular text-[15px] ${palette}`}
        >
            {leading ?? (Icon && <Icon className="w-5 h-5 shrink-0"/>)}
            <span>{text}</span>
            {/* در RTL «انتهای خط» چپ است، پس `mr-auto` این را به چپ می‌برد */}
            {trailing && <span className="mr-auto flex flex-row items-center">{trailing}</span>}
        </button>
    );
}
