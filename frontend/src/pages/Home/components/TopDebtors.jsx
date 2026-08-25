import {useNavigate} from "react-router";
import {faNumber, faPercent, toFaDigits} from "../../../lib/chart.js";
import {customerLedgerPath} from "../../../lib/paths.js";

/**
 * بدهکارترین مشتریان — نام، مبلغ، و نوارِ سهم از کلِ طلب.
 *
 * نوارِ سهم مهم‌تر از خودِ مبلغ است: می‌گوید طلبِ دفتر پیشِ چند نفر جمع شده.
 * هر ردیف مستقیم به دفترِ همان مشتری می‌رود، چون گامِ بعدیِ کاربر همان است.
 */
const TopDebtors = ({rows}) => {
    const navigate = useNavigate();

    return (
        <ol className="m-0 p-0 list-none flex-1 min-h-0 flex flex-col gap-2.5">
            {rows.map((customer, index) => (
                <li key={customer.id}>
                    <button
                        type="button"
                        onClick={() => navigate(customerLedgerPath(customer.id))}
                        className="w-full text-right cursor-pointer rounded-xl px-2.5 py-2 min-w-0
                                   transition-colors duration-200
                                   hover:bg-var-color-01 dark:hover:bg-var-color-40"
                    >
                        <span className="flex flex-row items-center gap-2 min-w-0">
                            <span className="w-5 h-5 shrink-0 rounded-md flex items-center justify-center text-[10.5px]
                                             bg-var-color-56 text-var-color-55 font-IRANSansXFaNumMedium">
                                {toFaDigits(index + 1)}
                            </span>
                            <span className="truncate text-[12.5px] text-var-color-06 dark:text-var-color-01">
                                {customer.fullname}
                            </span>
                            <span className="mr-auto shrink-0 text-[12.5px] font-IRANSansXFaNumMedium text-var-color-55">
                                {faNumber(customer.amount)}
                            </span>
                        </span>

                        {/* نوارِ سهم. در RTL باید از راست پر شود، پس خودِ نوار
                            ml-auto می‌گیرد تا به لبهٔ راست بچسبد. */}
                        <span className="mt-1.5 flex flex-row items-center gap-2 min-w-0">
                            <span className="h-1.5 flex-1 rounded-full overflow-hidden
                                             bg-var-color-02 dark:bg-var-color-38">
                                <span className="block h-full rounded-full ml-auto bg-var-color-55
                                                 transition-[width] duration-700 ease-out"
                                      style={{width: `${Math.max(customer.share, 3)}%`}}/>
                            </span>
                            <span className="shrink-0 text-[10px] text-var-color-04 dark:text-var-color-39">
                                {faPercent(customer.share)}
                            </span>
                            <span className="shrink-0 text-[10px] text-var-color-04 dark:text-var-color-39">
                                {customer.days === null ? "—" : `${toFaDigits(customer.days)} روز`}
                            </span>
                        </span>
                    </button>
                </li>
            ))}
        </ol>
    );
};

export default TopDebtors;
