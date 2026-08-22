import * as z from "zod";
import {toEnglishDigits} from "../lib/utils.js";

// مبلغ از ورودی با جداکنندهٔ سه‌رقمی می‌آید؛ اینجا به عدد تبدیل می‌شود.
// خالی بودن مجاز است (یعنی صفر) — قاعدهٔ «حداقل یکی از دو مبلغ» پایین‌تر است.
const amountSchema = z
    .string()
    .trim()
    .transform((value) => toEnglishDigits(value).replace(/,/g, ""))
    .refine((value) => value === "" || /^\d+$/.test(value), {message: "مبلغ فقط می‌تواند عدد باشد."})
    .transform((value) => (value === "" ? 0 : Number(value)))
    .refine((value) => value <= 9_999_999_999, {message: "مبلغ وارد شده بیش از حد بزرگ است."});

export const transactionSchema = z
    .object({debt: amountSchema, paid: amountSchema})
    // همان قاعدهٔ سریالایزر در سمت سرور — تراکنشِ صفر/صفر بی‌معناست. تکرارش اینجا
    // فقط برای این است که کاربر پیش از رفت‌وبرگشت با سرور جواب بگیرد.
    .refine((data) => data.debt !== 0 || data.paid !== 0, {
        message: "حداقل یکی از مبلغ نسیه یا پرداختی باید وارد شود.",
        path: ["debt"],
    });
