import {FaRegEye, FaRegEyeSlash} from "react-icons/fa6";

/**
 * چشمِ نمایش/پنهانِ رمز — داخلِ کادرِ رمز، با پراپِ `trailing`ِ `Field`.
 * با کادرِ خالی خاموش است: چشمِ باز روی هیچ، بی‌معناست.
 *
 * یک کامپوننت است نه کپیِ درجا، چون فرمِ ثبت‌نام دو تا دارد (رمز و تکرارش) و
 * ورود یکی؛ سه نسخهٔ جدا یعنی روزی یکی‌شان رنگِ دیگری می‌گیرد.
 *
 * ⚠️ `enabled:`/`disabled:` لازم است: رنگ و هاور روی دکمهٔ disabled هم می‌نشیند.
 */
const EyeButton = ({shown, disabled, onToggle}) => (
    <button
        type="button"
        tabIndex={-1}
        onClick={onToggle}
        disabled={disabled}
        aria-label={shown ? "پنهان کردن رمز" : "نمایش رمز"}
        className="grid place-items-center
                   disabled:text-var-color-70 dark:disabled:text-var-color-71
                   enabled:text-var-color-71 dark:enabled:text-var-color-70 enabled:cursor-pointer"
    >
        {shown ? <FaRegEyeSlash/> : <FaRegEye/>}
    </button>
);

export default EyeButton;
