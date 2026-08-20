import {createContext, useContext} from "react";

export const AuthContext = createContext(null);

// هوک سفارشی برای دسترسی به اطلاعات احراز هویت از هر کامپوننتی.
// نزدیک‌ترین AuthProvider بالادست را پیدا می‌کند و مقدارش را برمی‌گرداند:
// { user: {id, fullname, phone, ...} | null, loading: bool, setUser: fn }
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth باید داخل AuthProvider استفاده شود");
    return ctx;
};
