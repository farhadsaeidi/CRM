export const BASE_URL = "/api";

// کارهای بی خطر! کارهایی که نیاز به مهر امنیتی ندارن
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

// گرفتن مهر امنیتی
function getCookie(name) {
    const match = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    // match.pop() ---> آخرین عضو آرایه مچ
    return match ? decodeURIComponent(match.pop()) : null;
}

// تابع برای ارسال درخواست به سرور
async function request(path, {method = "GET", body, ...options} = {}) {
    // { method = "GET", body, ...options } ---> اطلاعات اضافه غیر از متد و بادی رو در قالب آبجکت بریز توی آپشن
    // آبجکت هدرز داخل آپشن رو باز کن، محتویاتش رو (در صورت وجود) بریز داخل یه آبجکت خالی به اسم هدرز
    const headers = {...(options.headers || {})};
    // فرم‌دیتا (آپلود فایل): مرورگر خودش Content-Type چندبخشی را با boundary ست می‌کند
    const isFormData = body instanceof FormData;
    // اگه اطلاعات فرم وجود داشته باشه
    if (body !== undefined && !isFormData) {
        // به سرور میگیم که اطلاعات داره به صورت قالب جیسون ارسال میشه
        headers["Content-Type"] = "application/json";
    }
    // اگه متدی که درخواست باهاش فرستاده میشه نیاز به مهر امنیتی داشته باشه
    if (!SAFE_METHODS.includes(method.toUpperCase())) {
        const csrftoken = getCookie("csrftoken");
        if (csrftoken) headers["X-CSRFToken"] = csrftoken;
    }
    // دریافت پاسخ از سرور
    const response = await fetch(BASE_URL + path, {
        method,
        headers,
        credentials: "include", // کوکی‌هایی که مرورگر برای این دامنه داره، با درخواست فرستاده بشه
        body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
        ...options,
    });
    // خواندن پاسخ (اگر بدنه JSON نبود، به‌جای کرش خام نگه می‌داریم)
    let data = null;
    if (response.status !== 204) {
        const text = await response.text();
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                // پاسخ JSON نبود (مثلاً صفحهٔ خطای پراکسی یا HTML) — data را null نگه می‌داریم
                data = null;
            }
        }
    }
    // مدیریت خطا
    if (!response.ok) {
        const error = new Error("Request failed");
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return data;
}

export const api = {
    // 🔍 فقط نگاه کن
    get: (path, options) => request(path, {method: "GET", ...options}),
    // ➕ چیز جدید بساز
    post: (path, body, options) => request(path, {method: "POST", body, ...options}),
    // 🔄 کامل عوض کن
    put: (path, body, options) => request(path, {method: "PUT", body, ...options}),
    // ✏️ یه تیکه رو عوض کن
    patch: (path, body, options) => request(path, {method: "PATCH", body, ...options}),
    // ❌ پاک کن
    delete: (path, options) => request(path, {method: "DELETE", ...options}),
};

// یک‌بار در شروع اپ صدا زده می‌شود تا کوکی CSRF ست شود.
// نکته: توکن CSRF بعد از login می‌چرخد، ولی چون هر درخواست کوکی را دوباره
// می‌خواند (getCookie داخل request)، نیازی به فراخوانی دوبارهٔ این نیست.
export const ensureCsrf = () => api.get("/auth/csrf/");

// بررسی سلامتِ زنجیرهٔ فرانت → پراکسی → جنگو
export const health = () => api.get("/health/");
