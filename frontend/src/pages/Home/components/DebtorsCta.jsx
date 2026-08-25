import {useNavigate} from "react-router";
import {FiArrowLeft} from "react-icons/fi";
import {HiOutlineBanknotes} from "react-icons/hi2";
import {faNumber, toFaDigits} from "../../../lib/chart.js";
import {CUSTOMERS_PATH} from "../../../lib/paths.js";

/**
 * کارتِ اقدام — «چند مشتری بدهکارند و چقدر»، با دکمه‌ای که فهرستِ مشتریان را با
 * فیلترِ بدهکار باز می‌کند.
 *
 * در نمونه‌های مرجع این کارت سیاه بود، ولی آنجا کلِ داشبورد تمِ روشنِ ثابت دارد.
 * اینجا هر دو تم وجود دارد و کارتِ سیاه در تمِ لایت تنها چیزِ تیرهٔ صفحه می‌شد و
 * وصله به نظر می‌رسید. پس سطحش مثل بقیهٔ کاشی‌هاست و تاکیدش از رنگِ صورتیِ بدهی
 * و دکمهٔ توپُر می‌آید، نه از پس‌زمینهٔ تیره.
 */
const DebtorsCta = ({count, amount, delay = 0}) => {
    const navigate = useNavigate();

    return (
        <section
            style={{animationDelay: `${delay}ms`}}
            className="animate-fade-up group relative min-w-0 overflow-hidden flex flex-col justify-between gap-4
                       rounded-[18px] p-4 bg-var-color-00 dark:bg-var-color-36
                       border border-var-color-02 dark:border-var-color-38
                       transition-colors duration-300 hover:border-var-color-14 dark:hover:border-var-color-16"
        >
            <span aria-hidden="true"
                  className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full
                             bg-var-color-55 opacity-[0.07] blur-3xl
                             transition-transform duration-500 group-hover:scale-125"/>

            <div className="relative flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="m-0 text-[12px] text-var-color-04 dark:text-var-color-39">مشتریانِ بدهکار</p>
                    <p className="m-0 mt-2 flex flex-row items-baseline gap-1.5">
                        <strong className="text-[28px] leading-none font-IRANSansXFaNumDemiBold
                                           tracking-tight text-var-color-08 dark:text-var-color-01">
                            {toFaDigits(count)}
                        </strong>
                        <span className="text-[12px] text-var-color-04 dark:text-var-color-39">نفر</span>
                    </p>
                    <p className="m-0 mt-2 text-[13px] font-IRANSansXFaNumMedium text-var-color-55">
                        {faNumber(amount)}
                        <span className="mr-1 text-[11px] font-IRANSansXFaNumLight
                                         text-var-color-04 dark:text-var-color-39">تومان طلب</span>
                    </p>
                </div>
                <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center
                                 bg-var-color-56 text-var-color-55">
                    <HiOutlineBanknotes className="w-5 h-5"/>
                </span>
            </div>

            {/* روی زمینهٔ فیروزه‌ای، متنِ تیره کنتراستِ بیشتری از سفید دارد — همان
                قاعده‌ای که برای دکمهٔ فیلتر و شمارهٔ صفحهٔ فعال هم به کار رفت */}
            <button
                type="button"
                onClick={() => navigate(`${CUSTOMERS_PATH}?filter=debt`)}
                className="relative w-full flex flex-row items-center justify-center gap-2 py-2 rounded-xl
                           cursor-pointer text-[13px] transition-all duration-200
                           bg-var-color-15 text-var-color-11 hover:brightness-110 active:scale-[0.98]"
            >
                مشاهدهٔ فهرست بدهکاران
                <FiArrowLeft className="w-4 h-4"/>
            </button>
        </section>
    );
};

export default DebtorsCta;
