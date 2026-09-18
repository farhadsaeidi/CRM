import {IoContrastOutline} from "react-icons/io5";
import MenuItem from "./MenuItem.jsx";
import {ThemeIcon} from "./ThemeSwitcher.jsx";
import {useTheme} from "../../lib/useTheme.js";

/**
 * «انتخاب تم» در منوی تنظیمات — همان کارِ دکمهٔ هدر، در جایی که بقیهٔ تنظیمات هم
 * هستند.
 *
 * سمتِ راست یک آیکونِ عمومیِ «روشن/تیره» است (دایرهٔ نیمه‌پر) و سمتِ چپ همان
 * خورشید/ماهِ هدر. آیکونِ راست عمداً خورشید یا ماه نیست، وگرنه در یک ردیف دو
 * خورشید کنارِ هم می‌نشستند.
 *
 * ⚠️ مثلِ «انتخاب رنگ»، زدنِ این ردیف منو را **نمی‌بندد**: کاربر نتیجه را روی کلِ
 * صفحه می‌بیند و اگر نپسندید، همان‌جا برش می‌گرداند.
 */
const ThemeMenuItem = () => {
    const {isDarkMode, toggleTheme} = useTheme();

    return (
        <MenuItem
            icon={IoContrastOutline}
            text="انتخاب تم"
            toggle="start"
            onClick={toggleTheme}
            // نسبتِ اندازهٔ ماه به خورشید همان نسبتِ هدر است (۷٫۷۵ به ۷)
            trailing={<ThemeIcon isDarkMode={isDarkMode} sunClass="w-5 h-5 shrink-0"
                                 moonClass="w-5.5 h-5.5 shrink-0"/>}
        />
    );
};

export default ThemeMenuItem;
