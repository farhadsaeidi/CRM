import {useEffect, useState} from "react";
import {FiUsers} from "react-icons/fi";
import Breadcrumb from "../../components/common/Breadcrumb.jsx";
import CustomerKpis from "./components/CustomerKpis.jsx";
import CustomersTable from "./components/CustomersTable.jsx";
import {CUSTOMER_CREATED_EVENT} from "../../lib/events.js";
import {CUSTOMERS_PATH} from "../../lib/paths.js";

/**
 * صفحهٔ مشتریان — بدون سایدبار و ۹۰٪ عرضِ صفحه.
 *
 * دفترِ تراکنش‌های یک مشتری دیگر اینجا نیست؛ مسیرِ خودش را دارد
 * (`/customers/:customerId/transactions`) و در `CustomerLedger` رندر می‌شود.
 */
const Customers = () => {
    // شاخص‌ها بیرونِ جدول‌اند و از تغییرِ داده خبر ندارند، پس جدول بعد از هر
    // کراد این کلید را جلو می‌برد تا دوباره خوانده شوند
    const [statsKey, setStatsKey] = useState(0);

    // مودالِ «ثبت مشتری جدید» هدر در RootLayout است و از این صفحه خبر ندارد
    useEffect(() => {
        const onCreated = () => setStatsKey((k) => k + 1);
        window.addEventListener(CUSTOMER_CREATED_EVENT, onCreated);
        return () => window.removeEventListener(CUSTOMER_CREATED_EVENT, onCreated);
    }, []);

    return (
        // ۹۰٪ عرض و وسط‌چین — جدول تا لبه‌های صفحه کش نیاید و ستون‌ها بی‌جهت از هم
        // دور نشوند
        <section className="h-full min-h-0 flex flex-col">
            <div className="w-[90%] mx-auto min-w-0 min-h-0 flex flex-col max-h-full">
                <Breadcrumb items={[{label: "مشتریان", to: CUSTOMERS_PATH, icon: FiUsers}]}/>
                <CustomerKpis refreshKey={statsKey}/>
                <CustomersTable refreshSignal={statsKey} onChanged={() => setStatsKey((k) => k + 1)}/>
            </div>
        </section>
    );
};

export default Customers;
