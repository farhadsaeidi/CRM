import {Link, useNavigate} from "react-router";
import LogoIcon from "./LogoIcon.jsx";
import ThemeSwitcher from "./ThemeSwitcher.jsx";

const Header = () => {
    const navigate = useNavigate();
    return (
        <header className="w-full h-(--header-height) shrink-0 py-3.5 px-4.5 flex justify-between items-center gap-3 rounded-[18px] bg-var-color-00 dark:bg-var-color-36 border border-var-color-02 dark:border-var-color-38">
            {/* لوگو و عنوان — راهِ برگشت به داشبورد از هر صفحه‌ای */}
            <Link to="/home" className="min-w-0 flex items-center gap-4 no-underline">
                <div className="w-13 h-13 shrink-0">
                    <LogoIcon className="w-full h-full"/>
                </div>
                <div className="min-w-0">
                    <h1 className="m-0 text-2xl text-var-color-08 dark:text-var-color-01 tracking-wide whitespace-nowrap overflow-hidden text-ellipsis font-MorabbaMedium">
                        سامانه مدیریت مشتریان
                    </h1>
                    <p className="mt-0.75 mb-0 text-sm text-var-color-04 dark:text-var-color-39 whitespace-nowrap overflow-hidden text-ellipsis">
                        دفتر حساب نسیه و پرداختی مشتریان
                    </p>
                </div>
            </Link>

            {/* تغییر تم + ثبت مشتری جدید */}
            <div className="shrink-0 flex items-center gap-4">
                <ThemeSwitcher/>
                {/* جداکننده */}
                <span className="hidden 2xs:inline-block w-px h-11 bg-var-color-04"/>
                {/* از هر صفحه‌ای کار می‌کند: به صفحهٔ مشتریان می‌برد و با ‎?new=1‎
                    می‌گوید مودالِ ثبت باز شود. قبلاً رویدادِ سراسری بود و بیرونِ
                    صفحهٔ مشتریان شنونده‌ای نداشت، یعنی دکمه بی‌اثر می‌شد. */}
                <button
                    type="button"
                    className="hidden 2xs:flex py-1.5 px-4.5 rounded-[14px] btn btn-bluish"
                    onClick={() => navigate("/customers?new=1")}
                >
                    <span className="text-2xl ml-2 pt-1.25">+</span>
                    <h2 className="m-0 text-[17px] whitespace-nowrap">ثبت مشتری جدید</h2>
                </button>
            </div>
        </header>
    );
};

export default Header;
