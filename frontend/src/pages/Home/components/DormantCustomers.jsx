import {useNavigate} from "react-router";
import {FiMoon} from "react-icons/fi";
import {toFaDigits} from "../../../lib/chart.js";
import {customerLedgerPath} from "../../../lib/paths.js";

/**
 * مشتریانِ راکد — کسانی که مدتی است تراکنشی ندارند، و آن‌هایی که هرگز نداشته‌اند.
 *
 * معادلِ کاشیِ «کم موجودی انبار» در داشبوردهای فروشگاهی: فهرستی که کاربر باید
 * رویش اقدام کند، نه صرفاً بخواند. دو گروه با برچسبِ متفاوت نشان داده می‌شوند
 * چون پیگیریِ «مشتریِ قدیمی که غیبش زده» با «مشتریِ ثبت‌شده‌ای که هنوز خرید
 * نکرده» یکی نیست.
 */
const DormantCustomers = ({rows}) => {
    const navigate = useNavigate();

    return (
        <ul className="m-0 p-0 list-none flex-1 min-h-0 grid grid-cols-1 2xs:grid-cols-2 gap-1.5">
            {rows.map((customer) => (
                <li key={customer.id} className="min-w-0">
                    <button
                        type="button"
                        onClick={() => navigate(customerLedgerPath(customer.id))}
                        className="w-full text-right cursor-pointer rounded-xl px-2.5 py-2 min-w-0
                                   flex flex-row items-center gap-2.5 transition-colors duration-200
                                   hover:bg-var-color-01 dark:hover:bg-var-color-40"
                    >
                        <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center
                                         bg-var-color-01 dark:bg-var-color-40
                                         text-var-color-04 dark:text-var-color-39">
                            <FiMoon className="w-3.5 h-3.5"/>
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] text-var-color-06 dark:text-var-color-01">
                                {customer.fullname}
                            </span>
                            <span className="block mt-0.5 text-[10px] font-IRANSansXFaNumUltraLight
                                             text-var-color-04 dark:text-var-color-39">
                                {customer.phone}
                            </span>
                        </span>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${
                            customer.never
                                ? "bg-var-color-01 dark:bg-var-color-40 text-var-color-04 dark:text-var-color-39"
                                : "bg-var-color-54 text-var-color-53"
                        }`}>
                            {customer.never ? "بدون تراکنش" : `${toFaDigits(customer.days)} روز`}
                        </span>
                    </button>
                </li>
            ))}
        </ul>
    );
};

export default DormantCustomers;
