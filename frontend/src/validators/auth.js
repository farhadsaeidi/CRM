import * as z from "zod";
import {toEnglishDigits} from "../lib/utils.js";

/**
 * اعتبارسنجی فرم‌های احراز هویت.
 *
 * برخلاف SAM که تابعِ نرمال‌سازی را در هر فایلِ ولیدیتور کپی کرده بود، اینجا همه از
 * یک جا می‌آیند؛ قاعدهٔ شماره همراه در چند نسخهٔ واگرا تکرار نمی‌شود.
 *
 * پیش‌شماره‌های معتبر موبایل ایران (تا ۱۴۰۵):
 *   0901–0905 ایرانسل · 0910–0919 همراه اول · 0920–0922 رایتل
 *   0930 و 0933–0939 ایرانسل · 0990–0999 همراه اول
 */

// تبدیل ارقام فارسی/عربی، حذف فاصله و خط‌تیره و پرانتز، و تبدیل پیش‌شمارهٔ بین‌المللی
function normalizePhone(value) {
    if (typeof value !== "string") return value;
    return toEnglishDigits(value)
        .replace(/[\s\-()]/g, "")
        .replace(/^\+98|^0098|^98/, "0");
}

const phoneSchema = z
    .string({required_error: "فیلد شماره همراه الزامی است."})
    .trim()
    .nonempty("فیلد شماره همراه الزامی است.")
    .transform(normalizePhone)
    .pipe(
        z
            .string()
            .length(11, "شماره همراه باید ۱۱ رقم باشد.")
            .regex(/^09(0[1-5]|1[0-9]|2[0-2]|3[035-9]|9[0-9])\d{7}$/, "شماره همراه معتبر نیست.")
            // جلوی شماره‌هایی مثل ۰۹۹۹۹۹۹۹۹۹۹ را می‌گیرد
            .refine((val) => !/^(\d)\1{10}$/.test(val), {message: "شماره همراه معتبر نیست."})
    );

// رمزِ ورود فقط باید خالی نباشد. حداقلِ طول اینجا اعمال نمی‌شود چون قاعده‌ای است
// برای *ساختن* رمز، نه *بررسی* رمزی که از قبل وجود دارد — اعمالش روی فرم ورود،
// حساب‌های قدیمی با رمزِ کوتاه‌تر را برای همیشه بیرون نگه می‌داشت.
const loginPasswordSchema = z
    .string({required_error: "فیلد کلمه عبور الزامی است."})
    .nonempty("فیلد کلمه عبور الزامی است.")
    .max(128, "کلمه عبور باید حداکثر ۱۲۸ کاراکتر داشته باشد.");

// رمزِ تازه — اینجا قاعدهٔ حداقلِ طول اعمال می‌شود، هم‌راستا با سرور
const newPasswordSchema = loginPasswordSchema
    .min(4, "کلمه عبور باید حداقل ۴ کاراکتر داشته باشد.");

const fullnameSchema = z
    .string({required_error: "فیلد نام و نام خانوادگی الزامی است."})
    .trim()
    .nonempty("فیلد نام و نام خانوادگی الزامی است.")
    .min(3, "فیلد نام و نام خانوادگی باید حداقل ۳ کاراکتر داشته باشد.")
    .max(30, "فیلد نام و نام خانوادگی باید حداکثر ۳۰ کاراکتر داشته باشد.");

// نامِ فیلدها عمداً با نامِ کلیدهایی که سرور در fieldErrors برمی‌گرداند یکی است،
// تا خطای سرور بدون نگاشت روی همان اینپوت بنشیند.
export const loginSchema = z.object({username: phoneSchema, password: loginPasswordSchema});

export const profileSchema = z.object({
    // سقفِ ۴۰ کاراکتر از خودِ پیامکِ یادآوری می‌آید، نه سلیقه — نامِ بلندتر پیامک
    // را بی‌دلیل چندبخشی می‌کند
    business_name: z.string().trim().max(40, "نام کسب‌وکار باید حداکثر ۴۰ کاراکتر باشد."),
    fullname: z
        .string({required_error: "فیلد نام و نام خانوادگی الزامی است."})
        .trim()
        .min(3, "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد.")
        .max(100, "نام و نام خانوادگی باید حداکثر ۱۰۰ کاراکتر باشد."),
});

export const changePasswordSchema = z
    .object({
        old_password: z
            .string({required_error: "فیلد رمز قبلی الزامی است."})
            .trim()
            .nonempty("فیلد رمز قبلی الزامی است."),
        new_password: newPasswordSchema,
        repeat_password: z
            .string({required_error: "فیلد تکرار رمز جدید الزامی است."})
            .trim()
            .nonempty("فیلد تکرار رمز جدید الزامی است."),
    })
    // تطابق دو رمز روی خودِ فیلدِ تکرار گزارش می‌شود تا فوکوس جای درستی برود
    .refine((data) => data.new_password === data.repeat_password, {
        message: "رمز جدید و تکرار آن یکسان نیستند.",
        path: ["repeat_password"],
    })
    // رمز جدید نباید همان رمز قبلی باشد، وگرنه تغییری رخ نداده
    .refine((data) => data.old_password !== data.new_password, {
        message: "رمز جدید نباید با رمز قبلی یکسان باشد.",
        path: ["new_password"],
    });

export const registerSchema = z
    .object({
        fullname: fullnameSchema,
        phone: phoneSchema,
        password: newPasswordSchema,
        repeat_password: z
            .string({required_error: "فیلد تکرار رمز عبور الزامی است."})
            .trim()
            .nonempty("فیلد تکرار رمز عبور الزامی است."),
    })
    // تطابق روی خودِ فیلدِ تکرار گزارش می‌شود تا فوکوس جای درستی برود — همان
    // قاعده‌ای که فرمِ تغییرِ رمز هم دارد
    .refine((data) => data.password === data.repeat_password, {
        message: "رمز عبور و تکرار آن یکسان نیستند.",
        path: ["repeat_password"],
    });

export const otpPhoneSchema = z.object({otpPhone: phoneSchema});

export const otpConfirmSchema = z.object({
    otpConfirm: z
        .string({required_error: "فیلد کد تایید الزامی است."})
        .trim()
        .nonempty("فیلد کد تایید الزامی است.")
        .transform(toEnglishDigits)
        .pipe(z.string().regex(/^\d{5}$/, "کد تایید باید ۵ رقمی باشد.")),
});
