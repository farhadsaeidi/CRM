import {useCallback} from "react";
import {useLocation, useNavigate} from "react-router";

/**
 * دکمهٔ «بازگشت» یعنی صفحهٔ قبل، نه یک مقصدِ ثابت — کاربر ممکن است از داشبورد
 * آمده باشد، یا از جدولِ تراکنش‌ها به دفترِ یک مشتری رفته باشد و بخواهد برگردد.
 *
 * تنها استثنا وقتی است که همین صفحه اولین ورودیِ تاریخچه باشد (لینکِ مستقیم یا
 * تبِ تازه)؛ آنجا `navigate(-1)` کاربر را از خودِ اپ بیرون می‌برد یا اصلاً کاری
 * نمی‌کند. react-router در آن حالت `location.key` را `"default"` می‌گذارد، پس
 * همان را نشانه می‌گیریم و به مقصدِ پشتیبان می‌رویم.
 */
export const useGoBack = (fallback = "/home") => {
    const navigate = useNavigate();
    const location = useLocation();
    return useCallback(() => {
        if (location.key === "default") navigate(fallback, {replace: true});
        else navigate(-1);
    }, [location.key, navigate, fallback]);
};
