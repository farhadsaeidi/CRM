// رنگِ هر فرم — ورود آبی (اکسنتِ قفل‌شده با `accent-base`)، ثبت‌نام صورتی.
// همان دو تُنِ HMS با رنگ‌های CRM.
const TONES = {
    accent: {icon: "text-var-color-15", input: "auth-input-accent"},
    secondary: {icon: "text-var-color-77", input: "auth-input-secondary"},
};

/**
 * ورودیِ متنیِ فرم‌های احراز هویت — عیناً `Field`ِ HMS: لیبل، و زیرش کادرِ
 * `h-10` با آیکونِ چسبیده به راست و در صورتِ نیاز دکمه‌ای در چپ.
 *
 * ⚠️ **`error` فقط بوردر را قرمز می‌کند و متنی زیرِ کادر نمی‌نویسد.** پیام با
 * نوارِ پیغام می‌آید؛ نوشتنش زیرِ کادر همان حرف را دو بار می‌زد و ارتفاعِ کارتِ
 * ثابت‌قد را با هر خطا می‌پراند.
 *
 * ⚠️ **لیبل عمداً `span` است نه `label`.** با `label`، کلیک روی عنوان هم کادر را
 * فوکوس می‌کرد و بوردرش رنگ عوض می‌کرد؛ در HMS خواسته شد رنگ فقط با کلیکِ داخلِ
 * خودِ کادر عوض شود. نامِ فیلد با `aria-label` روی `input` می‌رود تا صفحه‌خوان
 * آن را از دست ندهد.
 */
const Field = ({
    label,
    value,
    onChange,
    tone = "accent",
    error = "",
    icon = null,
    type = "text",
    placeholder = "",
    inputMode,
    autoComplete = "off",
    trailing = null,      // دکمهٔ داخلِ کادر، سمتِ چپ (مثلِ چشمِ رمز)
    inputRef,
    className = "",
}) => {
    const palette = TONES[tone] ?? TONES.accent;

    return (
        <div className={`w-full ${className}`}>
            <span className="block text-var-color-71 dark:text-var-color-70 select-none">{label}</span>
            <div className="relative w-full h-10 mt-2">
                {icon && (
                    <span className={`absolute inset-y-0 right-3 flex items-center pointer-events-none ${palette.icon}`}>
                        {icon}
                    </span>
                )}
                <input
                    ref={inputRef}
                    type={type}
                    value={value}
                    onChange={onChange}
                    inputMode={inputMode}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    aria-label={label}
                    aria-invalid={Boolean(error)}
                    className={`w-full h-full text-[15px] rounded-xl auth-input ${palette.input} input-placeholder
                        ${icon ? "pr-8.5" : "pr-3"} ${trailing ? "pl-10" : "pl-3"}
                        ${error ? "auth-input-error" : ""}`}
                />
                {/* ⚠️ `inset-y-0 flex items-center` است نه `top-1/2 -translate-y-1/2`.
                    دومی **رَپِر** را وسط می‌گذارد نه محتوایش را: دکمهٔ داخلش روی
                    خطِ پایهٔ متن می‌نشیند، پس رَپِر به اندازهٔ فرورفتگیِ حروف
                    بلندتر می‌شد و آیکونِ چشم چند پیکسل بالاتر می‌افتاد. */}
                {trailing && (
                    <div className="absolute inset-y-0 left-3 flex items-center">{trailing}</div>
                )}
            </div>
        </div>
    );
};

export default Field;
