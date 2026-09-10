import {useEffect, useState} from "react";
import {ensureCsrf, getCookie} from "../api/client";
import {authApi} from "../api/auth";
import {AuthContext} from "./AuthContext";

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    // حالت انتظار اولیه لازم است: بدون آن، کاربرِ لاگین‌شده یک لحظه صفحهٔ ورود را
    // می‌بیند و بعد به صفحهٔ خودش پرت می‌شود — تجربهٔ کاربریِ بدی است.
    //
    // ⚠️ **ولی بازدیدکننده‌ای که کوکیِ `csrftoken` ندارد اصلاً منتظر نمی‌ماند.**
    // آن کوکی در اولین بارگذاری (`ensureCsrf`) و هنگامِ ورود ست می‌شود، پس بدونش
    // هیچ نشستی روی این آدرس ممکن نیست و جواب از قبل معلوم است: مهمان. پیش‌تر
    // همان مهمان — مثلاً کسی که لینکِ تونل را تازه باز کرده — تا پایانِ دو
    // رفت‌وبرگشت از پشتِ تونلِ کُند چند ثانیه صفحهٔ خالی می‌دید و بعد به لاگین
    // می‌رفت. اگر هم برخلافِ انتظار `me` کاربری برگرداند، `PublicOnlyRoute` خودش
    // او را به داشبورد می‌فرستد؛ پس این میان‌بر هیچ‌وقت کسی را جای غلط نگه نمی‌دارد.
    const [loading, setLoading] = useState(() => Boolean(getCookie("csrftoken")));

    useEffect(() => {
        (async () => {
            // ⚠️ هم‌زمان، نه پشتِ سرِ هم: `me` یک GET است و به کوکیِ CSRF نیازی
            // ندارد، پس منتظرِ اولی ماندن فقط زمانِ بالا آمدن را دو برابر می‌کرد.
            const [, me] = await Promise.allSettled([ensureCsrf(), authApi.me()]);
            // خطا یعنی کاربر وارد نشده است
            setUser(me.status === "fulfilled" ? me.value : null);
            setLoading(false);
        })();
    }, []);

    return (
        <AuthContext.Provider value={{user, loading, setUser}}>
            {children}
        </AuthContext.Provider>
    );
};
