import {FiUsers} from "react-icons/fi";
import Breadcrumb from "../../components/common/Breadcrumb.jsx";
import CustomersTable from "./components/CustomersTable.jsx";
import {CUSTOMERS_PATH} from "../../lib/paths.js";

/**
 * صفحهٔ مشتریان — بدون سایدبار و ۹۰٪ عرضِ صفحه.
 *
 * دفترِ تراکنش‌های یک مشتری دیگر اینجا نیست؛ مسیرِ خودش را دارد
 * (`/customers/:customerId/transactions`) و در `CustomerLedger` رندر می‌شود.
 */
const Customers = () => (
    // ۹۰٪ عرض و وسط‌چین — جدول تا لبه‌های صفحه کش نیاید و ستون‌ها بی‌جهت از هم
    // دور نشوند
    <section className="h-full min-h-0 flex flex-col">
        <div className="w-[90%] mx-auto min-w-0 min-h-0 flex flex-col max-h-full">
            <Breadcrumb items={[{label: "مشتریان", to: CUSTOMERS_PATH, icon: FiUsers}]}/>
            <CustomersTable/>
        </div>
    </section>
);

export default Customers;
