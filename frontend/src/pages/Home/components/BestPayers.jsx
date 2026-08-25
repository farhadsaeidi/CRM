import {useNavigate} from "react-router";
import {FaMedal} from "react-icons/fa6";
import {faNumber, faPercent, toFaDigits} from "../../../lib/chart.js";
import {customerLedgerPath} from "../../../lib/paths.js";

/**
 * خوش‌حساب‌ترین مشتریان — سه نفرِ اول با مدالِ طلا، نقره و برنز.
 *
 * تعریفِ «خوش‌حساب» صریح است تا رتبه‌بندی قابلِ دفاع باشد: مشتری‌ای که **نسیه
 * گرفته** و بیشترین نسبتِ پرداخت به نسیه را دارد. کسی که هرگز نسیه نگرفته
 * خوش‌حساب نیست، فقط سابقه‌ای ندارد — پس اصلاً در این فهرست نمی‌آید. نسبت سقفِ
 * ۱۰۰٪ دارد (پرداختِ بیشتر از نسیه یعنی بستانکاری، نه خوش‌حسابیِ بیشتر) و در
 * تساوی، مبلغِ بزرگ‌تر جلو می‌افتد — وگرنه «۱۰۰٪ از پنجاه هزار تومان» بالای
 * «۱۰۰٪ از پنج میلیون» می‌نشست.
 */

// رنگ‌های واقعیِ مدال‌اند، نه رنگِ تم — به همین دلیل در پالتِ شماره‌دار نیستند
const MEDALS = [
    {color: "#D4AF37", glow: "rgba(212, 175, 55, 0.18)", label: "طلا"},
    {color: "#A8B2BD", glow: "rgba(168, 178, 189, 0.18)", label: "نقره"},
    {color: "#C87533", glow: "rgba(200, 117, 51, 0.18)", label: "برنز"},
];

const BestPayers = ({rows}) => {
    const navigate = useNavigate();

    return (
        <ol className="m-0 p-0 list-none flex-1 min-h-0 flex flex-col gap-1.5">
            {rows.map((customer, index) => {
                const medal = MEDALS[index];
                return (
                    <li key={customer.id}>
                        <button
                            type="button"
                            onClick={() => navigate(customerLedgerPath(customer.id))}
                            style={medal ? {background: medal.glow} : undefined}
                            className={`w-full text-right cursor-pointer rounded-xl px-2.5 py-2 min-w-0
                                        flex flex-row items-center gap-2.5 transition-colors duration-200
                                        ${medal ? "" : "hover:bg-var-color-01 dark:hover:bg-var-color-40"}`}
                        >
                            {medal ? (
                                <span className="w-6 h-6 shrink-0 flex items-center justify-center"
                                      title={`مدال ${medal.label}`}>
                                    <FaMedal className="w-5 h-5" style={{color: medal.color}}/>
                                </span>
                            ) : (
                                <span className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[10.5px]
                                                 bg-var-color-01 dark:bg-var-color-40
                                                 text-var-color-04 dark:text-var-color-39">
                                    {toFaDigits(index + 1)}
                                </span>
                            )}

                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12.5px] text-var-color-06 dark:text-var-color-01">
                                    {customer.fullname}
                                </span>
                                <span className="block mt-0.5 text-[10px] text-var-color-04 dark:text-var-color-39">
                                    {faNumber(customer.paid)} از {faNumber(customer.debt)} تومان
                                </span>
                            </span>

                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-IRANSansXFaNumMedium
                                             bg-var-color-47 text-var-color-31">
                                {faPercent(customer.ratio)}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ol>
    );
};

export default BestPayers;
