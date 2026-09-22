import {HiOutlineSparkles, HiSparkles} from "react-icons/hi2";

/**
 * «نمایش هوشمند» در کادرِ نوشتن: روشن یعنی جوابِ داده‌ای به‌صورتِ کارت و جدول و
 * نمودار ساخته شود، خاموش یعنی فقط متن. معنای دقیقِ هر حالت سمتِ سرور است
 * (`answer_stream`)؛ اینجا فقط کلید است.
 *
 * نامِ فارسی است، نه «SmartThink»: همهٔ برنامه فارسی است و این گزینه دربارهٔ
 * **شکلِ جواب** است، نه عمقِ فکرِ مدل — «فکرِ بیشتر» قول می‌داد که جواب درست‌تر
 * است، در حالی که فقط تصویری‌تر است.
 *
 * حالتِ روشن همان تهرنگِ دکمه‌های آرامِ برنامه را می‌گیرد (۱۲ و ۴۴) تا از دور
 * پیدا باشد روشن است. برچسب در گوشیِ باریک پنهان می‌شود و فقط ستاره می‌ماند.
 */
const SmartViewToggle = ({on, onChange, disabled = false}) => {
    const Icon = on ? HiSparkles : HiOutlineSparkles;
    return (
        <button type="button" aria-pressed={on} disabled={disabled} onClick={() => onChange(!on)}
                title={on ? "جواب‌ها با کارت، جدول و نمودار ساخته می‌شوند — برای جوابِ متنی خاموش کنید"
                          : "روشن کنید تا جواب‌ها با کارت، جدول و نمودار ساخته شوند"}
                className={`h-8 px-2.5 rounded-full flex items-center gap-1.5 text-[12px] cursor-pointer
                            transition-colors duration-200 disabled:opacity-50 disabled:cursor-default
                            ${on
                                ? "bg-var-color-12 dark:bg-var-color-44 text-var-color-19 dark:text-var-color-15"
                                : "text-var-color-05 dark:text-var-color-39 enabled:hover:bg-var-color-01 dark:enabled:hover:bg-var-color-65"}`}>
            <Icon className="w-4 h-4 shrink-0"/>
            <span className="hidden 2xs:inline">نمایش هوشمند</span>
        </button>
    );
};

export default SmartViewToggle;
