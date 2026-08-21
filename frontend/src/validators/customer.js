import * as z from "zod";
import {toEnglishDigits} from "../lib/utils.js";

// همان قاعدهٔ شمارهٔ همراهِ فرم‌های احراز هویت — عمداً از اینجا دوباره تعریف
// نمی‌شود که دو نسخهٔ واگرا نداشته باشیم، ولی پیام‌ها به زبانِ «مشتری» است.
const phoneSchema = z
    .string({required_error: "فیلد شماره تماس الزامی است."})
    .trim()
    .nonempty("فیلد شماره تماس الزامی است.")
    .transform((value) => toEnglishDigits(value).replace(/[\s\-()]/g, "").replace(/^\+98|^0098|^98/, "0"))
    .pipe(
        z
            .string()
            .length(11, "شماره تماس باید ۱۱ رقم باشد.")
            .regex(/^09(0[1-5]|1[0-9]|2[0-2]|3[035-9]|9[0-9])\d{7}$/, "شماره تماس معتبر نیست.")
            .refine((val) => !/^(\d)\1{10}$/.test(val), {message: "شماره تماس معتبر نیست."})
    );

export const customerSchema = z.object({
    fullname: z
        .string({required_error: "فیلد نام و نام خانوادگی الزامی است."})
        .trim()
        .nonempty("فیلد نام و نام خانوادگی الزامی است.")
        .min(3, "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد.")
        .max(80, "نام و نام خانوادگی باید حداکثر ۸۰ کاراکتر باشد."),
    phone: phoneSchema,
});
