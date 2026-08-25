import {useEffect, useState} from "react";
import {Outlet, ScrollRestoration, useMatches} from "react-router";
import Header from "../common/Header.jsx";
import Footer from "../common/Footer.jsx";
import CustomerModal from "../../pages/Customers/components/CustomerModal.jsx";
import {CUSTOMER_CREATED_EVENT, OPEN_NEW_CUSTOMER_EVENT} from "../../lib/events.js";

const DEFAULT_TITLE = "سامانه مدیریت مشتریان";

const RootLayout = () => {
    const matches = useMatches();
    // مودالِ «ثبت مشتری جدید» اینجاست نه در صفحهٔ مشتریان: دکمه‌اش در هدر است و
    // در همهٔ صفحه‌ها دیده می‌شود، پس باید همان‌جا که کاربر هست باز شود و او را
    // به صفحهٔ دیگری پرت نکند.
    const [newCustomerOpen, setNewCustomerOpen] = useState(false);
    // useMatches لیستِ روت‌های فعال را می‌دهد؛ handleها از ریشه تا برگ روی هم می‌ریزند
    const handle = matches.reduce((merged, match) => ({...merged, ...(match.handle ?? {})}), {});

    // صفحه‌های احراز هویت پس‌زمینه و چیدمانِ تمام‌صفحهٔ خودشان را دارند، پس نه
    // پس‌زمینهٔ نقطه‌ای می‌خواهند نه هدر و فوتر
    const hasChrome = "chrome" in handle ? handle.chrome : true;

    useEffect(() => {
        document.title = handle.title ? `${handle.title}` : DEFAULT_TITLE;
    }, [handle.title]);

    useEffect(() => {
        const open = () => setNewCustomerOpen(true);
        window.addEventListener(OPEN_NEW_CUSTOMER_EVENT, open);
        return () => window.removeEventListener(OPEN_NEW_CUSTOMER_EVENT, open);
    }, []);

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
                <Header onNewCustomer={() => setNewCustomerOpen(true)}/>
                <main className="flex-1 min-h-0 overflow-hidden">
                    <Outlet/>
                </main>
            </div>
            <Footer/>

            {/* فقط وقتی باز است mount می‌شود تا state داخلیِ فرم هر بار از نو ساخته
                شود — همان دلیلی که پنلِ جستجوی تاریخ هم شرطی رندر می‌شود */}
            {newCustomerOpen && (
                <CustomerModal
                    mode="create"
                    customer={null}
                    onClose={() => setNewCustomerOpen(false)}
                    onDone={() => {
                        setNewCustomerOpen(false);
                        // صفحهٔ مشتریان (اگر باز باشد) باید فهرست و شاخص‌هایش را
                        // تازه کند. رویدادِ سراسری همان الگویی است که برای جستجوی
                        // تاریخِ فوتر هم به کار رفت: این مودال بیرونِ درختِ صفحه است.
                        window.dispatchEvent(new CustomEvent(CUSTOMER_CREATED_EVENT));
                    }}
                />
            )}
        </section>
    );
};

export default RootLayout;
