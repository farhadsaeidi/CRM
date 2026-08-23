import {FiCheck} from "react-icons/fi";

/**
 * نشانهٔ انتخابِ ردیفِ جدول — دایرهٔ خالی در حالت عادی، و دایرهٔ پرِ آبی با تیک
 * وقتی ردیف انتخاب شده است.
 *
 * خودش دکمه نیست: انتخاب با کلیک روی کلِ ردیف انجام می‌شود، پس این فقط نمایش
 * است و `aria-hidden` می‌گیرد تا صفحه‌خوان دو بار همان چیز را نگوید (وضعیتِ
 * انتخاب را `aria-selected` روی خودِ ردیف می‌گوید).
 *
 * یک‌جا تعریف شده تا جدول مشتریان و جدول تراکنش‌ها یک شکل بمانند.
 */
const RowSelectMark = ({selected}) => (
    <span
        aria-hidden="true"
        className={`w-4.5 h-4.5 shrink-0 rounded-full border flex items-center justify-center transition-all duration-200 ease-in-out ${
            selected
                ? "bg-var-color-15 border-var-color-15 text-var-color-00"
                : "bg-transparent border-var-color-04 dark:border-var-color-05 text-transparent"
        }`}
    >
        <FiCheck className="w-3 h-3" strokeWidth={3}/>
    </span>
);

export default RowSelectMark;
