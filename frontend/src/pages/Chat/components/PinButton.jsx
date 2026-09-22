import {useState} from "react";
import {TbPin, TbPinnedFilled} from "react-icons/tb";

/**
 * «سنجاق به داشبورد» زیرِ رابطِ یک جواب — و در حالتِ سنجاق‌شده، برداشتنش.
 *
 * دو حالت یک دکمه‌اند نه دو دکمه: کاربر همان‌جا که سنجاق کرده باید بتواند
 * پشیمان شود، بی‌آنکه تا داشبورد برود. حالتِ سنجاق‌شده همان تهرنگِ دکمه‌های
 * آرامِ برنامه را می‌گیرد (۱۲/۱۳ و ۴۴/۱۶) تا از دورِ هم پیدا باشد.
 */
const PinButton = ({pinned, onPin, onUnpin}) => {
    const [busy, setBusy] = useState(false);
    const run = async () => {
        setBusy(true);
        try {
            await (pinned ? onUnpin() : onPin());
        } finally {
            setBusy(false);
        }
    };
    return (
        <button type="button" onClick={run} disabled={busy} aria-pressed={pinned}
                className={`mt-2 inline-flex flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px]
                            border transition-colors duration-200 cursor-pointer disabled:cursor-wait
                            ${pinned
                                ? "text-var-color-19 dark:text-var-color-15 bg-var-color-12 dark:bg-var-color-44 border-var-color-13 dark:border-var-color-16"
                                : `text-var-color-04 dark:text-var-color-39 border-var-color-02 dark:border-var-color-38
                                   enabled:hover:text-var-color-19 dark:enabled:hover:text-var-color-15
                                   enabled:hover:border-var-color-13 dark:enabled:hover:border-var-color-16`}`}>
            {pinned ? <TbPinnedFilled className="w-3.5 h-3.5"/> : <TbPin className="w-3.5 h-3.5"/>}
            {pinned ? "سنجاق‌شده در داشبورد" : "سنجاق به داشبورد"}
        </button>
    );
};

export default PinButton;
