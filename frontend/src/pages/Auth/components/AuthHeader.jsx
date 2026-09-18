import {HiOutlineArrowRight} from "react-icons/hi";
import ThemeSwitcher from "../../../components/common/ThemeSwitcher.jsx";

// سوییچرِ تم با خنثی‌های HMS، نه رنگِ هدرِ برنامه
const SWITCHER_COLORS =
    "text-var-color-71 hover:text-var-color-74 dark:text-var-color-70 dark:hover:text-var-color-67";

/**
 * سرِ کارت‌های احراز هویت: عنوان وسط، سوییچرِ تم چپ، و اگر `onBack` داده شود
 * دکمهٔ بازگشت راست. در RTL اولین فرزند راست‌ترین است.
 *
 * ⚠️ **دو طرفِ عنوان هم‌پهنا می‌مانند.** عنوان با `justify-between` وسط
 * می‌نشیند، پس هر اختلافِ پهنا آن را به همان اندازه کج می‌کرد. دکمهٔ بازگشت
 * ۱۰ است (اندازهٔ HMS) و سوییچر ۸، پس جای سوییچر هم ۱۰ گرفته می‌شود و خودش به
 * لبهٔ چپ می‌چسبد — همان جایی که در فرمِ ورود می‌نشیند.
 */
const AuthHeader = ({title, onBack}) => (
    <header className="w-full py-3 flex flex-row justify-between items-center">
        {onBack ? (
            <button
                type="button"
                tabIndex={-1}
                aria-label="بازگشت"
                onClick={onBack}
                className="grid place-items-center w-10 h-10 rounded-full cursor-pointer
                           text-var-color-71 dark:text-var-color-70
                           hover:bg-var-color-67 dark:hover:bg-var-color-73
                           hover:text-var-color-74 dark:hover:text-var-color-67
                           transition-all duration-200 ease-in-out"
            >
                {/* در RTL «بازگشت» رو به راست است، نه چپ */}
                <HiOutlineArrowRight className="w-6 h-6"/>
            </button>
        ) : (
            <div className="w-8 h-8"/>
        )}
        <h2 className="text-var-color-74 dark:text-var-color-67 text-2xl text-center">{title}</h2>
        <div className={`${onBack ? "w-10" : "w-8"} flex justify-end`}>
            <ThemeSwitcher colors={SWITCHER_COLORS}/>
        </div>
    </header>
);

export default AuthHeader;
