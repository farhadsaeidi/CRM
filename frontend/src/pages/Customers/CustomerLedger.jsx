import {useState} from "react";
import {useParams} from "react-router";
import {FiUsers} from "react-icons/fi";
import {HiOutlineArrowsRightLeft} from "react-icons/hi2";
import Breadcrumb from "../../components/common/Breadcrumb.jsx";
import TransactionsTable from "./components/TransactionsTable.jsx";
import {CUSTOMERS_PATH} from "../../lib/paths.js";
import {useGoBack} from "../../lib/useGoBack.js";

/**
 * دفترِ تراکنش‌های یک مشتری — مسیرِ `/customers/:customerId/transactions`.
 *
 * نامِ مشتری از پاسخِ خودِ سرور می‌آید نه از پراپ، پس رفرشِ صفحه و باز کردنِ
 * مستقیمِ لینک هم کار می‌کند. جدول همان نام را بالای خودش نشان می‌دهد و از
 * همان‌جا هم به نوارِ مسیر می‌رسد.
 */
const CustomerLedger = () => {
    const {customerId} = useParams();
    const goBack = useGoBack(CUSTOMERS_PATH);
    const [customer, setCustomer] = useState(null);

    return (
        <section className="h-full min-h-0 flex flex-col">
            <div className="w-[90%] mx-auto min-w-0 min-h-0 flex flex-col max-h-full">
                <Breadcrumb items={[
                    {label: "مشتریان", to: CUSTOMERS_PATH, icon: FiUsers},
                    // تا وقتی نامِ مشتری نرسیده، عنوانِ عمومی نشان داده می‌شود —
                    // نه جای خالی که نوار را موقعِ لود بپراند
                    {label: customer?.fullname ?? "دفتر حساب", icon: HiOutlineArrowsRightLeft},
                ]}/>
                {/* key تضمین می‌کند با عوض شدنِ مشتری، فیلتر و جستجوی تاریخِ
                    مشتریِ قبلی روی این یکی نماند */}
                <TransactionsTable key={customerId} customerId={customerId}
                                   onBack={goBack} onCustomerLoaded={setCustomer}/>
            </div>
        </section>
    );
};

export default CustomerLedger;
