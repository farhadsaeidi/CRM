import {useState} from "react";
import {useParams} from "react-router";
import {FiUsers} from "react-icons/fi";
import {HiOutlineArrowsRightLeft} from "react-icons/hi2";
import Breadcrumb from "../../components/common/Breadcrumb.jsx";
import LedgerKpis from "./components/LedgerKpis.jsx";
import TransactionsTable from "./components/TransactionsTable.jsx";
import {CUSTOMERS_PATH} from "../../lib/paths.js";
import {useGoBack} from "../../lib/useGoBack.js";

/**
 * دفترِ تراکنش‌های یک مشتری — مسیرِ `/customers/:customerId/transactions`.
 *
 * نامِ مشتری در هدرِ خودِ جدول دیده می‌شود (از پاسخِ سرور، نه از پراپ — پس رفرش و
 * لینکِ مستقیم هم کار می‌کند)، و نوارِ مسیر عنوانِ عمومیِ صفحه را می‌گوید.
 */
const CustomerLedger = () => {
    const {customerId} = useParams();
    const goBack = useGoBack(CUSTOMERS_PATH);
    // شاخص‌ها بیرونِ جدول‌اند و از تغییرِ داده خبر ندارند، پس جدول بعد از هر کراد
    // این کلید را جلو می‌برد تا دوباره خوانده شوند
    const [statsKey, setStatsKey] = useState(0);

    return (
        <section className="h-full min-h-0 flex flex-col">
            <div className="w-[90%] mx-auto min-w-0 min-h-0 flex flex-col max-h-full">
                <Breadcrumb items={[
                    {label: "مشتریان", to: CUSTOMERS_PATH, icon: FiUsers},
                    {label: "تراکنش های مشتری", icon: HiOutlineArrowsRightLeft},
                ]}/>
                <LedgerKpis customerId={customerId} refreshKey={statsKey}/>
                {/* key تضمین می‌کند با عوض شدنِ مشتری، فیلتر و جستجوی تاریخِ
                    مشتریِ قبلی روی این یکی نماند */}
                <TransactionsTable key={customerId} customerId={customerId} onBack={goBack}
                                   onChanged={() => setStatsKey((k) => k + 1)}/>
            </div>
        </section>
    );
};

export default CustomerLedger;
