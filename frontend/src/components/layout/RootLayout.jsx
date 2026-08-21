import {useEffect} from "react";
import {Outlet, ScrollRestoration, useMatches} from "react-router";
import Header from "../common/Header.jsx";
import Footer from "../common/Footer.jsx";

const DEFAULT_TITLE = "سامانه مدیریت مشتریان";

const RootLayout = () => {
    const matches = useMatches();
    // useMatches لیستِ روت‌های فعال را می‌دهد؛ handleها از ریشه تا برگ روی هم می‌ریزند
    const handle = matches.reduce((merged, match) => ({...merged, ...(match.handle ?? {})}), {});

    // صفحه‌های احراز هویت پس‌زمینه و چیدمانِ تمام‌صفحهٔ خودشان را دارند، پس نه
    // پس‌زمینهٔ نقطه‌ای می‌خواهند نه هدر و فوتر
    const hasChrome = "chrome" in handle ? handle.chrome : true;

    useEffect(() => {
        document.title = handle.title ? `${handle.title}` : DEFAULT_TITLE;
    }, [handle.title]);

    if (!hasChrome) {
        return (
            <>
                <ScrollRestoration/>
                <Outlet/>
            </>
        );
    }

    return (
        <section className="flex flex-col min-h-screen font-IRANSansXFaNumRegular bg-var-color-49 dark:bg-var-color-35 bg-dotted">
            {/* بازگرداندن اسکرول به بالا هنگام جابجایی بین صفحات */}
            <ScrollRestoration/>
            {/* فوتر ثابت است و از جریانِ صفحه بیرون؛ پس ارتفاعش را از ارتفاع این
                ناحیه کم می‌کنیم تا محتوا زیرش پنهان نشود */}
            <div className="flex flex-col gap-4 h-[calc(100vh-var(--footer-height))] p-4 overflow-hidden">
                <Header/>
                <main className="flex-1 min-h-0 overflow-hidden">
                    <Outlet/>
                </main>
            </div>
            <Footer/>
        </section>
    );
};

export default RootLayout;
