import {IoIosClose} from "react-icons/io";

/**
 * دکمهٔ ✕ گوشهٔ هدرِ مودال‌ها — دایرهٔ بی‌رنگ که با هاور پس‌زمینه می‌گیرد.
 *
 * اندازه به عرضِ خودِ مودال بستگی دارد: `md` برای کارت‌های پهن (w-120) و `sm`
 * برای کارتِ باریک‌تر (max-w-100). یک‌جا تعریف شده تا هر چهار مودال یک شکل بمانند.
 */
const SIZES = {
    sm: "w-7 h-7 text-xl",
    md: "w-8 h-8 text-2xl",
};

const ModalCloseButton = ({size = "md", onClick}) => (
    <button
        type="button"
        tabIndex={-1}
        aria-label="بستن"
        onClick={onClick}
        className={`${SIZES[size] ?? SIZES.md} shrink-0 rounded-full flex items-center justify-center cursor-pointer
                    text-var-color-04 dark:text-var-color-39
                    hover:bg-var-color-01 dark:hover:bg-var-color-40
                    hover:text-var-color-06 dark:hover:text-var-color-01
                    transition-colors duration-200`}
    >
        <IoIosClose/>
    </button>
);

export default ModalCloseButton;
