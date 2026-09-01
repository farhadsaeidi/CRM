import {useEffect} from "react";

/**
 * تب زدن را داخلِ **فیلدهای** یک فرم نگه می‌دارد.
 *
 * فرم‌های ورود و ثبت‌نام کنارِ اینپوت‌ها چند دکمهٔ ناوبری هم دارند (ورود با
 * پیامک، فراموشی رمز، تعویضِ تم، چشمِ نمایشِ رمز). با تب زدنِ پیش‌فرضِ مرورگر،
 * کاربر بعد از رمز به آن‌ها می‌رسید و بعد از صفحه بیرون می‌رفت؛ در حالی که
 * کارِ او در این صفحه پر کردنِ دو فیلد است.
 *
 * حالا Tab بینِ فیلدها می‌چرخد و از آخری به اولی برمی‌گردد.
 *
 * ⚠️ **لیسنر روی `document` است نه روی خودِ فرم.** نسخهٔ اول روی فرم بود و
 * **اولین** Tab را از دست می‌داد: تا وقتی کاربر جایی کلیک نکرده، فوکوس روی
 * `body` است و رویداد اصلاً به فرم نمی‌رسد، پس مرورگر خودش اولین عنصرِ
 * فوکوس‌پذیرِ صفحه را انتخاب می‌کرد. در «ورود با پیامک» آن عنصر دکمهٔ بازگشتِ
 * سرِ فرم بود، و کاربر برای رسیدن به تنها فیلدِ صفحه باید دو بار Tab می‌زد.
 *
 * ⚠️ **دکمهٔ ارسال هم از چرخه بیرون است، ولی دور از دسترس نیست:** زدنِ Enter
 * داخلِ هر فیلدِ متنی فرم را می‌فرستد — رفتارِ بومیِ خودِ HTML. اگر روزی این
 * فرم `type="submit"` نداشته باشد، این فرض می‌شکند.
 *
 * @param ref رفِ خودِ `<form>`
 * @param enabled خاموش کردنِ حلقه (مثلاً فرمی که پنهان است)
 */
export function useInputTabLoop(ref, enabled = true) {
    useEffect(() => {
        const form = ref.current;
        if (!enabled || !form) return undefined;

        const onKeyDown = (event) => {
            if (event.key !== "Tab") return;
            // فرمِ دیگری روی همین صفحه (مثلاً مودالی که باز شده) کارِ خودش را
            // بکند؛ ما فقط وقتی دخالت می‌کنیم که فوکوس یا داخلِ این فرم باشد یا
            // اصلاً جایی نباشد.
            const inside = form.contains(document.activeElement);
            if (!inside && document.activeElement !== document.body) return;

            // هر بار از نو خوانده می‌شود نه یک‌بار در ابتدا: فیلدها ممکن است
            // شرطی باشند (مثلِ «تکرار رمز» که فقط در ثبت‌نام هست) و فهرستِ
            // کش‌شده بعد از اولین رندر کهنه می‌شد.
            const fields = [...form.querySelectorAll("input")].filter(
                (el) => !el.disabled && !el.readOnly && el.type !== "hidden"
                    // عنصرِ پنهان `offsetParent` ندارد — فیلدی که دیده نمی‌شود
                    // نباید فوکوس بگیرد، وگرنه کاربر روی جایی می‌نویسد که
                    // نمی‌بیندش
                    && el.offsetParent !== null,
            );
            if (fields.length === 0) return;

            event.preventDefault();
            const step = event.shiftKey ? -1 : 1;
            const at = fields.indexOf(document.activeElement);
            // فوکوس بیرونِ فهرست (روی دکمه‌ای از همین فرم، یا هنوز روی body):
            // Tab به اولین فیلد می‌رود، نه به عنصرِ بعدیِ صفحه
            const next = at === -1
                ? (step === 1 ? 0 : fields.length - 1)
                : (at + step + fields.length) % fields.length;
            fields[next].focus();
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [ref, enabled]);
}
