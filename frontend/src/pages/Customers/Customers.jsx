import {useCallback} from "react";
import {useSearchParams} from "react-router";
import CustomersTable from "./components/CustomersTable.jsx";
import TransactionsTable from "./components/TransactionsTable.jsx";

/**
 * صفحهٔ مشتریان — بدون سایدبار و تمام‌عرض.
 *
 * دو نما دارد و هر دو از یوآرال می‌آیند:
 *   بدون پارامتر  → جدول مشتریان
 *   ‎?customer=<id>‎ → دفترِ تراکنش‌های همان مشتری
 *
 * سایدبارِ ناوبری فقط در صفحهٔ خانه است؛ اینجا کلِ عرض به خودِ جدول می‌رسد.
 */
const Customers = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const openCustomerId = searchParams.get("customer");

    const closeTransactions = useCallback(() => {
        setSearchParams((prev) => {
            const params = new URLSearchParams(prev);
            params.delete("customer");
            params.delete("tfilter");
            return params;
        });
    }, [setSearchParams]);

    return (
        // ۹۰٪ عرض و وسط‌چین — جدول تا لبه‌های صفحه کش نیاید و ستون‌ها بی‌جهت از
        // هم دور نشوند
        <section className="h-full min-h-0 flex flex-col">
            <div className="w-[90%] mx-auto min-w-0 min-h-0">
                {/* key تضمین می‌کند با عوض شدن مشتری، فیلتر و جستجوی تاریخِ مشتری
                    قبلی روی این یکی نماند */}
                {openCustomerId
                    ? <TransactionsTable key={openCustomerId} customerId={openCustomerId} onBack={closeTransactions}/>
                    : <CustomersTable/>}
            </div>
        </section>
    );
};

export default Customers;
