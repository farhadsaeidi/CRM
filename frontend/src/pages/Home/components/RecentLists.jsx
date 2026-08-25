import {useNavigate} from "react-router";
import {FiArrowDownLeft, FiArrowUpLeft, FiUserPlus} from "react-icons/fi";
import {faDate, faNumber, faShamsi} from "../../../lib/chart.js";
import {customerLedgerPath} from "../../../lib/paths.js";

/**
 * دو فهرستِ کوتاهِ «آخرین‌ها» — تراکنش‌ها و مشتریانِ تازه ثبت‌شده.
 *
 * در یک فایل‌اند چون ساختارِ ردیفشان یکی است و جدا کردنشان یعنی دو نسخهٔ واگرا
 * از همان چیدمان؛ همان اشتباهی که در پروژهٔ قدیمی افتاده بود.
 */

// هر ردیفِ تراکنش یا نسیه است یا پرداخت — هیچ‌وقت هر دو در یک سطر مهم نیست،
// پس همان طرفی که عدد دارد به‌عنوان نوعِ ردیف نمایش داده می‌شود.
const kindOf = (row) => (row.paid > 0
    ? {label: "پرداخت", amount: row.paid, icon: FiArrowUpLeft,
       chip: "bg-var-color-47 text-var-color-31"}
    : {label: "نسیه", amount: row.debt, icon: FiArrowDownLeft,
       chip: "bg-var-color-56 text-var-color-55"});

// جدولِ واقعی و نه فهرست: این کاشی دو ستونِ گرید پهناست و ستون‌بندی اینجا
// خواناتر از ردیف‌های دوطبقه است — همان چیدمانِ «آخرین سفارش‌ها» در نمونهٔ مرجع.
// از گرید استفاده می‌شود نه `<table>` طبیعی، تا ستون‌ها با بقیهٔ جدول‌های پروژه
// یک‌جور رفتار کنند و در نمای باریک هم نشکنند.
const ROW_GRID = "grid grid-cols-[1.5rem_minmax(6rem,1fr)_minmax(5rem,0.8fr)_minmax(4.5rem,0.7fr)_minmax(5rem,0.8fr)] items-center gap-2";

export const RecentTransactions = ({rows}) => {
    const navigate = useNavigate();

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <div className={`${ROW_GRID} px-2.5 pb-2 text-[10.5px] border-b
                             border-var-color-02 dark:border-var-color-38
                             text-var-color-04 dark:text-var-color-39`}>
                <span/>
                <span>مشتری</span>
                <span className="text-center">مبلغ (تومان)</span>
                <span className="text-center">نوع</span>
                <span className="text-center">تاریخ</span>
            </div>

            <ol className="m-0 p-0 list-none flex flex-col">
                {rows.map((row) => {
                    const kind = kindOf(row);
                    return (
                        <li key={row.id}>
                            <button
                                type="button"
                                onClick={() => navigate(customerLedgerPath(row.customer_id))}
                                className={`${ROW_GRID} w-full text-right cursor-pointer rounded-xl px-2.5 py-2
                                            min-w-0 transition-colors duration-200
                                            hover:bg-var-color-01 dark:hover:bg-var-color-40`}
                            >
                                <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${kind.chip}`}>
                                    <kind.icon className="w-3 h-3"/>
                                </span>
                                <span className="truncate text-[12.5px] text-var-color-06 dark:text-var-color-01">
                                    {row.customer_fullname}
                                </span>
                                <span className="text-center text-[12.5px] font-IRANSansXFaNumMedium
                                                 text-var-color-06 dark:text-var-color-01">
                                    {faNumber(kind.amount)}
                                </span>
                                <span className="flex justify-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${kind.chip}`}>
                                        {kind.label}
                                    </span>
                                </span>
                                <span className="text-center text-[11px] font-IRANSansXFaNumUltraLight
                                                 text-var-color-04 dark:text-var-color-39">
                                    {faShamsi(row)}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};

export const RecentCustomers = ({rows}) => {
    const navigate = useNavigate();

    return (
        <ol className="m-0 p-0 list-none flex-1 min-h-0 flex flex-col gap-1">
            {rows.map((customer) => (
                <li key={customer.id}>
                    <button
                        type="button"
                        onClick={() => navigate(customerLedgerPath(customer.id))}
                        className="w-full text-right cursor-pointer rounded-xl px-2.5 py-2 min-w-0
                                   flex flex-row items-center gap-2.5 transition-colors duration-200
                                   hover:bg-var-color-01 dark:hover:bg-var-color-40"
                    >
                        <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center
                                         bg-var-color-12 dark:bg-var-color-44 text-var-color-15">
                            <FiUserPlus className="w-3.5 h-3.5"/>
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
                        <span className="shrink-0 text-[10.5px] text-var-color-04 dark:text-var-color-39">
                            {faDate(customer.created)}
                        </span>
                    </button>
                </li>
            ))}
        </ol>
    );
};
