import {useEffect, useState} from "react";
import {ensureCsrf} from "../api/client";
import {authApi} from "../api/auth";
import {AuthContext} from "./AuthContext";

export const AuthProvider = ({children}) => {
    const [user, setUser] = useState(null);
    // حالت انتظار اولیه لازم است: بدون آن، کاربرِ لاگین‌شده یک لحظه صفحهٔ ورود را
    // می‌بیند و بعد به صفحهٔ خودش پرت می‌شود — تجربهٔ کاربریِ بدی است.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                await ensureCsrf();          // گرفتن کوکی CSRF از سرور
                const me = await authApi.me(); // بررسی وضعیت ورود
                setUser(me);
            } catch {
                setUser(null);               // خطا یعنی کاربر وارد نشده است
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <AuthContext.Provider value={{user, loading, setUser}}>
            {children}
        </AuthContext.Provider>
    );
};
