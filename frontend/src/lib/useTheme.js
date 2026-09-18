import {useEffect, useState} from "react";

// «تمِ تیره فعال است؟» — اول انتخابِ ذخیره‌شدهٔ کاربر، و اگر چیزی ذخیره نکرده،
// تمِ سیستم‌عامل
const readTheme = () => {
    if (typeof window === "undefined") return false;
    return localStorage.theme === "dark" ||
        (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
};

/**
 * وضعیتِ تمِ روشن/تیره و تابعِ عوض کردنش.
 *
 * ⚠️ **از `ThemeSwitcher` بیرون کشیده شد چون حالا دو جا تم را عوض می‌کنند:** دکمهٔ
 * هدر و ردیفِ «انتخاب تم» در منوی تنظیمات. آن ردیف خودش دکمه است و دکمهٔ هدر را
 * نمی‌شد داخلش گذاشت (دکمه داخلِ دکمه HTMLِ نامعتبر است)، پس منطق باید مشترک
 * می‌شد نه خودِ دکمه.
 *
 * ⚠️ هر نمونه وضعیتِ خودش را دارد و با رویدادِ `themeSynced` هم‌گام می‌ماند —
 * بدونش، زدنِ ردیفِ منو آیکونِ هدر را کهنه می‌گذاشت و برعکس. رویدادِ `storage`ِ
 * ساختگی هم برای همین است؛ رویدادِ واقعیِ `storage` فقط به تب‌های **دیگر** می‌رسد.
 */
export function useTheme() {
    const [isDarkMode, setIsDarkMode] = useState(readTheme);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", isDarkMode);
    }, [isDarkMode]);

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === "theme") setIsDarkMode(e.newValue === "dark");
        };
        // تا وقتی کاربر خودش انتخاب نکرده، تمِ سیستم دنبال می‌شود
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const onSystem = (e) => {
            if (!localStorage.theme) setIsDarkMode(e.matches);
        };
        const onSync = () => setIsDarkMode(readTheme());

        window.addEventListener("storage", onStorage);
        window.addEventListener("themeSynced", onSync);
        mediaQuery.addEventListener("change", onSystem);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("themeSynced", onSync);
            mediaQuery.removeEventListener("change", onSystem);
        };
    }, []);

    const toggleTheme = () => {
        const next = !isDarkMode;
        setIsDarkMode(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");

        window.dispatchEvent(new Event("themeSynced"));
        window.dispatchEvent(new StorageEvent("storage", {key: "theme", newValue: next ? "dark" : "light"}));
    };

    return {isDarkMode, toggleTheme};
}
