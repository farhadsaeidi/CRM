import {toEnglishDigits} from "./utils.js";

// کمک‌کننده‌های عددیِ صفحهٔ تراکنش‌ها. در پروژهٔ قدیمی همین سه تابع داخل هر کدام
// از کامپوننت‌های ثبت/ویرایش تکرار شده بودند و کم‌کم از هم واگرا شده بودند.

// نمایش عدد با ارقام فارسی و جداکنندهٔ سه‌رقمی — علامت منفی عمداً حذف می‌شود،
// چون بدهکار/بستانکار بودن با رنگ و برچسب گفته می‌شود نه با منفی
export const formatPersianNumber = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const num = parseInt(String(value).replace(/,/g, ""), 10);
    if (Number.isNaN(num)) return String(value);
    return new Intl.NumberFormat("fa-IR").format(Math.abs(num));
};

// ورودیِ مبلغ: فقط رقم، بدون صفرِ پیشرو، حداکثر ۱۰ رقم، با جداکنندهٔ سه‌رقمی
export const sanitizeAmount = (value = "") => {
    let digits = toEnglishDigits(value).replace(/\D/g, "");
    if (digits.length > 1) digits = digits.replace(/^0+/, "");
    digits = digits.slice(0, 10);
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// حذف جداکننده برای ارسال به سرور
export const unformatAmount = (value = "") => String(value).replace(/,/g, "");

const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const TENS = ["", "ده", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const HUNDREDS = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const SCALES = ["", "هزار", "میلیون", "میلیارد", "تریلیون"];

const threeDigitsToWords = (n) => {
    const parts = [];
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const one = n % 10;

    if (hundred > 0) parts.push(HUNDREDS[hundred]);
    // ۱۰ تا ۱۹ نامِ مستقل دارند و با الگوی «ده و یک» ساخته نمی‌شوند
    if (ten === 1) parts.push(TEENS[one]);
    else {
        if (ten > 0) parts.push(TENS[ten]);
        if (one > 0) parts.push(ONES[one]);
    }
    return parts.join(" و ");
};

// خواندنِ مبلغ به حروف، زیرِ ورودی نمایش داده می‌شود تا صفرِ اضافه به چشم بیاید
export const numberToPersianWords = (input) => {
    const digits = toEnglishDigits(String(input ?? "")).replace(/[,\s]/g, "");
    if (digits === "" || !/^\d+$/.test(digits)) return "";
    if (/^0+$/.test(digits)) return "صفر";

    let remaining = parseInt(digits, 10);
    if (!Number.isFinite(remaining)) return "";

    const chunks = [];
    let scaleIndex = 0;
    while (remaining > 0) {
        const chunk = remaining % 1000;
        if (chunk > 0) {
            const scale = SCALES[scaleIndex];
            chunks.unshift(scale ? `${threeDigitsToWords(chunk)} ${scale}` : threeDigitsToWords(chunk));
        }
        remaining = Math.floor(remaining / 1000);
        scaleIndex += 1;
    }
    return chunks.join(" و ");
};
