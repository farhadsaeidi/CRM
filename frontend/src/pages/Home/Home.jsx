import {useEffect, useState} from "react";
import {health} from "../../api/client";
import ThemeSwitcher from "../../components/common/ThemeSwitcher";

// صفحهٔ موقتِ اسکلت: تنها کارش این است که نشان دهد زنجیرهٔ
// React → پراکسی Vite → جنگو → DRF واقعاً برقرار است.
// با آمدن صفحات واقعی (مشتریان/تراکنش‌ها) حذف می‌شود.
const Home = () => {
    // null یعنی هنوز پاسخی نیامده؛ رشته یعنی نتیجهٔ نهایی
    const [apiStatus, setApiStatus] = useState(null);

    useEffect(() => {
        health()
            .then((data) => setApiStatus(data?.status === "ok" ? "ok" : "unexpected"))
            .catch(() => setApiStatus("error"));
    }, []);

    const statusText = {
        ok: "اتصال به API برقرار است.",
        unexpected: "API پاسخ داد ولی محتوایش مورد انتظار نبود.",
        error: "اتصال به API برقرار نشد — آیا سرور جنگو روی پورت ۸۰۰۰ بالاست؟",
    };

    return (
        <section className="flex min-h-full items-center justify-center p-4">
            <div className="form-container w-full max-w-lg rounded-2xl p-8 animate-fade-up">
                <header className="flex items-center gap-3">
                    <img src="/favicon.svg" alt="لوگو" className="h-10 w-10"/>
                    <h1 className="font-IRANSansXFaNumBold text-xl text-var-color-08 dark:text-var-color-01">
                        سامانه مدیریت مشتریان
                    </h1>
                    {/* در RTL برای چسباندن به انتهای خط از mr-auto استفاده می‌شود، نه ml-auto */}
                    <div className="mr-auto">
                        <ThemeSwitcher/>
                    </div>
                </header>

                <p className="mt-6 text-sm leading-7 text-var-color-05 dark:text-var-color-03">
                    اسکلت اولیهٔ پروژه آماده است: جنگو ۶ با DRF روی پستگرس، و فرانتِ
                    React ۱۹ با Vite و Tailwind نسخهٔ ۴. اپ‌های دامنه و لایهٔ احراز هویت
                    هنوز اضافه نشده‌اند.
                </p>

                <div className="mt-6 flex items-center gap-2 rounded-xl border border-var-color-02 bg-var-color-01 px-4 py-3 dark:border-var-color-07 dark:bg-var-color-10">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        apiStatus === null ? "bg-var-color-04"
                            : apiStatus === "ok" ? "bg-var-color-31"
                                : "bg-var-color-28"
                    }`}/>
                    <span className="text-sm text-var-color-06 dark:text-var-color-03">
                        {apiStatus === null ? "در حال بررسی اتصال به API ..." : statusText[apiStatus]}
                    </span>
                </div>
            </div>
        </section>
    );
};

export default Home;
