import {IoMoonOutline} from "react-icons/io5";
import {LuSun} from "react-icons/lu";
import {useTheme} from "../../lib/useTheme.js";

/**
 * آیکونِ تم — همان که هدر نشان می‌دهد. جدا شد تا ردیفِ «انتخاب تم» در منوی
 * تنظیمات **دقیقاً همین** را بکشد، نه یک نسخهٔ دوم که روزی از این جدا شود.
 *
 * آیکون **مقصد** را نشان می‌دهد نه وضعیتِ فعلی را: در تمِ تیره خورشید (یعنی «برو
 * روشن») و در روشن ماه. اندازه‌ها جدا داده می‌شوند چون ماه خطوطِ نازک‌تری دارد و
 * هم‌اندازهٔ خورشید، کوچک‌تر دیده می‌شد.
 */
export function ThemeIcon({isDarkMode, sunClass, moonClass}) {
    return isDarkMode ? <LuSun className={sunClass}/> : <IoMoonOutline className={moonClass}/>;
}

export default function ThemeSwitcher() {
    const {isDarkMode, toggleTheme} = useTheme();

    return (
        <button className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-var-color-06 transition-colors hover:text-var-color-08 focus:outline-none dark:text-var-color-03 dark:hover:text-var-color-04"
            type="button"
            tabIndex={-1}
            aria-label="تغییر تم"
            onClick={toggleTheme}>
            <ThemeIcon isDarkMode={isDarkMode} sunClass="h-7 w-7" moonClass="h-7.75 w-7.75"/>
        </button>
    );
}
