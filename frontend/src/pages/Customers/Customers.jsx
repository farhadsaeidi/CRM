import {useEffect, useState} from "react";
import {useNavigate} from "react-router";
import {FiLogOut} from "react-icons/fi";
import {api} from "../../api/client.js";
import {authApi} from "../../api/auth.js";
import {useAuth} from "../../context/AuthContext.js";
import ThemeSwitcher from "../../components/common/ThemeSwitcher.jsx";
import {notify} from "../../lib/notify.jsx";

// صفحهٔ موقتِ گام ۶: نشان می‌دهد ورود کار می‌کند و API اسکوپ‌شده پاسخ می‌دهد.
// در گام ۷ جای این، جدولِ کاملِ مشتریان با جستجو، فیلتر، صفحه‌بندی و مودال‌ها می‌آید.
const Customers = () => {
    const {user, setUser} = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        let ignore = false;
        api.get("/customers/")
            .then((data) => {
                if (ignore) return;
                const counts = {debt: 0, credit: 0, zero: 0};
                for (const row of data.results ?? []) {
                    if (row.code === -1) counts.debt += 1;
                    else if (row.code === 1) counts.credit += 1;
                    else counts.zero += 1;
                }
                setSummary({total: data.count, page: data.results ?? [], counts});
            })
            .catch(() => {
                if (!ignore) notify("دریافت فهرست مشتریان ناموفق بود.", "error");
            });
        return () => {
            ignore = true;
        };
    }, []);

    const onLogout = async () => {
        try {
            const res = await authApi.logout();
            setUser(null);
            notify(res.message, "success", 2000);
            navigate("/auth/login", {replace: true});
        } catch {
            notify("خروج ناموفق بود. لطفاً دوباره تلاش کنید.", "error");
        }
    };

    return (
        <section className="flex min-h-full items-center justify-center p-4">
            <div className="form-container w-full max-w-2xl rounded-2xl p-8 animate-fade-up">
                <header className="flex items-center gap-3">
                    <img src="/favicon.svg" alt="لوگو" className="h-10 w-10"/>
                    <div>
                        <h1 className="font-IRANSansXFaNumBold text-lg text-var-color-08 dark:text-var-color-01">
                            {user?.fullname}
                        </h1>
                        <p className="text-sm text-var-color-05 dark:text-var-color-04" dir="ltr">{user?.phone}</p>
                    </div>
                    {/* در RTL برای چسباندن به انتهای خط از mr-auto استفاده می‌شود */}
                    <div className="mr-auto flex items-center gap-2">
                        <ThemeSwitcher/>
                        <button type="button" onClick={onLogout}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm btn btn-bluish">
                            <FiLogOut className="h-4 w-4"/>
                            خروج
                        </button>
                    </div>
                </header>

                <p className="mt-6 text-sm leading-7 text-var-color-05 dark:text-var-color-03">
                    ورود با موفقیت انجام شد و API مشتریان پاسخ می‌دهد. جدولِ کامل با جستجو،
                    فیلتر و مودال‌های ساخت و ویرایش در گام بعد ساخته می‌شود.
                </p>

                {summary === null ? (
                    <p className="mt-6 text-sm text-var-color-04">در حال دریافت فهرست مشتریان ...</p>
                ) : (
                    <>
                        <div className="mt-6 grid grid-cols-3 gap-3">
                            {[
                                {label: "بدهکار", value: summary.counts.debt, tone: "text-var-color-28"},
                                {label: "بستانکار", value: summary.counts.credit, tone: "text-var-color-31"},
                                {label: "بی حساب", value: summary.counts.zero, tone: "text-var-color-04"},
                            ].map((card) => (
                                <div key={card.label}
                                     className="rounded-xl border border-var-color-02 bg-var-color-01 px-4 py-3 text-center dark:border-var-color-07 dark:bg-var-color-10">
                                    <div className={`text-2xl font-IRANSansXFaNumBold ${card.tone}`}>{card.value}</div>
                                    <div className="mt-1 text-xs text-var-color-05 dark:text-var-color-04">{card.label}</div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-sm text-var-color-05 dark:text-var-color-04">
                            مجموع مشتریان شما: {summary.total} نفر (این صفحه {summary.page.length} مورد را نشان می‌دهد)
                        </p>
                    </>
                )}
            </div>
        </section>
    );
};

export default Customers;
