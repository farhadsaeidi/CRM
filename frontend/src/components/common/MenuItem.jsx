// آیتمِ منو — همان الگوی پروژهٔ CustomerManagement. `toggle` تعیین می‌کند آیتم
// متعلق به کدام منوست و رنگِ حالتِ فعال و هاور از همان می‌آید.
//
// `leading` و `trailing` برای ردیف‌هایی است که چیزی بیش از آیکون و متن دارند —
// تیک و نمونه‌رنگِ کشوی انتخاب رنگ، یا فلشِ ردیفی که کشو را باز می‌کند. بودنشان
// یعنی آن ردیف‌ها هم از همین‌جا رنگ می‌گیرند و رنگ‌بندیِ منو یک نسخه بیشتر
// ندارد؛ کپیِ دوم همان‌جایی است که روزی از اصل واگرا می‌شود.

// این منوها زمینهٔ پُرِ اکسنت می‌گیرند. منوی دراپ‌داونِ فوتر عمداً بیرونِ فهرست
// است و همان تهرنگِ ملایمِ قبلی را دارد.
const ACCENT_FILL_MENUS = ["customersFilter", "transactionsFilter", "start", "accent"];

export default function MenuItem({
    id, icon: Icon, text, active, toggle, onClick, leading, trailing, expanded, selected,
}) {
    const accentFill = ACCENT_FILL_MENUS.includes(toggle);
    const palette =
        accentFill
            // روی زمینهٔ پُرِ اکسنت، متن و آیکونِ تیره خوانا‌تر از سفید است.
            // ⚠️ در تمِ تیره زمینه‌ای گذاشته نمی‌شود: بلوکِ تیره روی پنلِ تیره
            // کدر و سنگین دیده می‌شد. آنجا نشانه‌ها متنِ اکسنت و بوردرِ تهرنگِ
            // خودش است — بوردر هم از خانوادهٔ اکسنت می‌آید نه از سطوحِ سرمه‌ای،
            // وگرنه با عوض شدنِ رنگ جا می‌ماند و روی پنلِ هم‌رنگش گم می‌شود.
            ? active
                ? "bg-var-color-15 dark:bg-transparent text-var-color-11 dark:text-var-color-15 border-var-color-15 dark:border-var-color-13"
                : "text-var-color-08 dark:text-var-color-46 hover:bg-var-color-15 dark:hover:bg-transparent hover:text-var-color-11 dark:hover:text-var-color-15 hover:border-var-color-15 dark:hover:border-var-color-13"
            : active
                // var-color-40/41/46 فقط برای تم دارک‌اند؛ بدون پیشوند dark:
                // در تم لایت هم اعمال می‌شدند و آیتم سرمه‌ای تیره می‌شد
                ? "bg-var-color-17 dark:bg-var-color-40 text-var-color-19 dark:text-var-color-46 border-var-color-13 dark:border-var-color-41"
                : "text-var-color-08 dark:text-var-color-46 hover:bg-var-color-17 dark:hover:bg-var-color-40 hover:text-var-color-19 dark:hover:text-var-color-46 hover:border-var-color-13 dark:hover:border-var-color-41";

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
