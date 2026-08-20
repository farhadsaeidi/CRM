import {useEffect} from "react";
import {Outlet, ScrollRestoration, useMatches} from "react-router";

const DEFAULT_TITLE = "سامانه مدیریت مشتریان";

const RootLayout = () => {
    const matches = useMatches();
    // useMatches لیستِ روت‌های فعال را می‌دهد؛ handleها از ریشه تا برگ روی هم می‌ریزند
    const handle = matches.reduce((merged, match) => ({...merged, ...(match.handle ?? {})}), {});

    // صفحه‌های احراز هویت پس‌زمینه و چیدمانِ تمام‌صفحهٔ خودشان را دارند، پس
    // پس‌زمینهٔ نقطه‌ایِ اینجا نباید زیرشان بیفتد
    const hasChrome = "chrome" in handle ? handle.chrome : true;

    useEffect(() => {
        document.title = handle.title ? `${handle.title}` : DEFAULT_TITLE;
    }, [handle.title]);

    return (
        <section className={`flex flex-col min-h-screen font-IRANSansXFaNumRegular ${
            hasChrome ? "bg-var-color-49 dark:bg-var-color-35 bg-dotted" : ""
        }`}>
            {/* بازگرداندن اسکرول به بالا هنگام جابجایی بین صفحات */}
            <ScrollRestoration/>
            {/* هدر و فوتر وقتی پنل‌ها ساخته شدند اینجا اضافه می‌شوند و مثل SAM
                با handle صفحه‌به‌صفحه روشن/خاموش خواهند شد */}
            <main className="flex-1 min-h-0 overflow-auto">
                <Outlet/>
            </main>
        </section>
    );
};

export default RootLayout;
