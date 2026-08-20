import { useState, useEffect } from 'react';
import { IoMoonOutline } from "react-icons/io5";
import { LuSun } from "react-icons/lu";

export default function ThemeSwitcher() {
    // تابع برای گرفتن theme فعلی
    const getCurrentTheme = () => {
        if (typeof window === 'undefined') return false;
        return localStorage.theme === "dark" ||
            (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    };

    const [isDarkMode, setIsDarkMode] = useState(getCurrentTheme());

    // اعمال theme اولیه
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    // گوش دادن به تغییرات در localStorage و theme سیستم
    useEffect(() => {
        // ۱. گوش دادن به تغییرات localStorage
        const handleStorageChange = (e) => {
            if (e.key === 'theme') {
                setIsDarkMode(e.newValue === 'dark');
            }
        };

        // ۲. گوش دادن به تغییرات theme سیستم
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = (e) => {
            if (!localStorage.theme) {
                setIsDarkMode(e.matches);
            }
        };

        // ۳. گوش دادن به custom event برای sync بین کامپوننت‌ها
        const handleThemeSync = () => {
            setIsDarkMode(getCurrentTheme());
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('themeSynced', handleThemeSync);
        mediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('themeSynced', handleThemeSync);
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }, []);

    // تابع toggle که بقیه کامپوننت‌ها را هم به‌روز می‌کند
    const toggleTheme = () => {
        const newIsDark = !isDarkMode;
        setIsDarkMode(newIsDark);

        if (newIsDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }

        // sync بین کامپوننت‌ها و تب‌های مختلف
        window.dispatchEvent(new Event('themeSynced'));
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'theme',
            newValue: newIsDark ? 'dark' : 'light'
        }));
    };

    return (
        <button className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-var-color-06 transition-colors hover:text-var-color-08 focus:outline-none dark:text-var-color-03 dark:hover:text-var-color-04"
            type="button"
            tabIndex={-1}
            aria-label="تغییر تم"
            onClick={toggleTheme}>
            {isDarkMode ? <LuSun className="h-7 w-7" /> : <IoMoonOutline className="h-7.75 w-7.75" />}
        </button>
    );
}
