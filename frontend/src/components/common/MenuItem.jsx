// آیتمِ منو — همان الگوی پروژهٔ CustomerManagement. `toggle` تعیین می‌کند آیتم
// متعلق به کدام منوست و رنگِ حالتِ فعال و هاور از همان می‌آید.
export default function MenuItem({id, icon: Icon, text, active, toggle, onClick}) {
    const palette =
        // روی زمینهٔ فیروزه‌ای متن و آیکونِ تیره خوانا‌تر از سفید است
        toggle === "customersFilter"
            ? active
                ? "bg-var-color-15 dark:bg-var-color-35 text-var-color-11 dark:text-var-color-15 border-var-color-15 dark:border-var-color-37"
                : "text-var-color-08 dark:text-var-color-46 hover:bg-var-color-15 dark:hover:bg-var-color-35 hover:text-var-color-11 dark:hover:text-var-color-15 hover:border-var-color-15 dark:hover:border-var-color-37"
            : toggle === "transactionsFilter"
                ? active
                    ? "bg-var-color-29 text-var-color-31 border-var-color-47"
                    : "text-var-color-08 dark:text-var-color-46 hover:bg-var-color-29 hover:text-var-color-31 hover:border-var-color-47"
                : active
                    // var-color-40/41/46 فقط برای تم دارک‌اند؛ بدون پیشوند dark:
                    // در تم لایت هم اعمال می‌شدند و آیتم سرمه‌ای تیره می‌شد
                    ? "bg-var-color-17 dark:bg-var-color-40 text-var-color-19 dark:text-var-color-46 border-var-color-13 dark:border-var-color-41"
                    : "text-var-color-08 dark:text-var-color-46 hover:bg-var-color-17 dark:hover:bg-var-color-40 hover:text-var-color-19 dark:hover:text-var-color-46 hover:border-var-color-13 dark:hover:border-var-color-41";

    return (
        <button
            type="button"
            id={id}
            onClick={onClick}
            className={`w-full flex flex-row justify-start items-center gap-2.5 py-1.5 px-2.5 rounded-[10px] ${
                toggle === "transactionsFilter" ? "my-0.75" : "my-px"
            } transition-all duration-200 ease-in-out ${
                active ? "cursor-default" : "cursor-pointer"
            } bg-transparent border border-transparent font-IRANSansXFaNumRegular text-[15px] ${palette}`}
        >
            {Icon && <Icon className="w-5 h-5 shrink-0"/>}
            <span>{text}</span>
        </button>
    );
}
