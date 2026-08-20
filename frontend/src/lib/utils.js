// تبدیل ارقام فارسی/عربی به انگلیسی
export const toEnglishDigits = (input = "") =>
  String(input)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

// نگه‌داشتن فقط ارقام انگلیسی و محدودسازی به ۱۱ رقم (شماره همراه)
export const sanitizePhone = (value = "") => {
  const sanitized = toEnglishDigits(value).replace(/\D/g, "").slice(0, 11);
  // اگر اولین رقم 0 نباشه، هیچ رقمی وارد نشه
  if (sanitized.length > 0 && sanitized[0] !== "0") {
    return "";
  }
  return sanitized;
};
