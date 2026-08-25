import {api} from "./client";

// کلِ داشبورد در یک درخواست. هر کاشی یک aggregate است و فرستادنشان جدا فقط
// رفت‌وبرگشتِ شبکه اضافه می‌کند — منطقش سمتِ سرور در home/dashboard.py است.
export const dashboardApi = {
    get: (period = "year") => api.get(`/dashboard/?period=${encodeURIComponent(period)}`),
};

// همان واژگانِ فیلترِ دورهٔ جدول‌ها، تا کاربر دو زبانِ متفاوت یاد نگیرد
export const DASHBOARD_PERIODS = [
    {key: "today", label: "امروز"},
    {key: "week", label: "این هفته"},
    {key: "month", label: "این ماه"},
    {key: "year", label: "امسال"},
    {key: "all", label: "کل دوره"},
];
