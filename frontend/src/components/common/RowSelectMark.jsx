import {FiCheck} from "react-icons/fi";

/**
 * نشانهٔ انتخابِ ردیفِ جدول.
 *
 * غیرفعال: دایرهٔ کوچک، با همان پس‌زمینه و بوردرِ هدر و فوترِ کارتِ جدول
 * (`var-color-00`/`var-color-43` و `var-color-57`/`var-color-38`) تا با قابِ جدول
 * یکدست باشد و روی ردیف‌ها به چشم نزند.
 * فعال: دایرهٔ بزرگ‌ترِ آبی با تیکِ سفید و یک هالهٔ آبیِ کم‌رنگ دورش.
 *
 * تفاوتِ اندازه عمدی است — با `transition-all` خودِ بزرگ شدن هم نشانهٔ انتخاب
 * می‌شود، نه فقط رنگ.
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
        className={`shrink-0 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out ${
            selected
                ? "w-4.5 h-4.5 bg-var-color-15 text-var-color-00 ring-2 ring-var-color-13"
                : "w-4 h-4 border bg-var-color-00 dark:bg-var-color-43 border-var-color-57 dark:border-var-color-38"
        }`}
    >
        {selected && <FiCheck className="w-3 h-3" strokeWidth={3}/>}
    </span>
);

export default RowSelectMark;
