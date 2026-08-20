import {useEffect} from "react";
import {Outlet, ScrollRestoration, useMatches} from "react-router";

const DEFAULT_TITLE = "سامانه مدیریت مشتریان";

const RootLayout = () => {
    const matches = useMatches();
    // useMatches ---> لیستی از روت های فعال (به صورت آبجکت) رو میسازه
    const handle = matches.reduce((merged, match) => ({...merged, ...(match.handle ?? {})}), {});

    // بلاکِ عنوان
    useEffect(() => {
        document.title = handle.title ? `${handle.title}` : DEFAULT_TITLE;
    }, [handle.title]);

    return (
        <section className="flex flex-col min-h-screen font-IRANSansXFaNumRegular bg-var-color-49 dark:bg-var-color-35 bg-dotted">
            {/* بازگرداندن اسکرول به بالا هنگام جابجایی بین صفحات */}
            <ScrollRestoration/>
            {/* هدر و فوتر هنوز ساخته نشده‌اند؛ وقتی پنل‌ها آمدند اینجا اضافه می‌شوند
                و مثل SAM با handle.header/handle.footer صفحه‌به‌صفحه روشن/خاموش می‌شوند. */}
            <main className="flex-1 min-h-0 overflow-auto">
                <Outlet/>
            </main>
        </section>
    );
};

export default RootLayout;
