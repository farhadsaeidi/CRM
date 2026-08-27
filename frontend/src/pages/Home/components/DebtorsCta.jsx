import {useNavigate} from "react-router";
import {FiArrowLeft, FiUsers} from "react-icons/fi";
import DashboardTile from "./DashboardTile.jsx";
import {faNumber, toFaDigits} from "../../../lib/chart.js";
import {CUSTOMERS_PATH} from "../../../lib/paths.js";

/**
 * کارتِ اقدام — «چند مشتری بدهکارند و چقدر»، با دکمه‌ای که فهرستِ مشتریان را با
 * فیلترِ بدهکار باز می‌کند.
 *
 * ⚠️ قابش از `DashboardTile` می‌آید، نه یک کپیِ دستی. پیش‌تر پس‌زمینه و بوردر و
 * انیمیشنِ ورود و هدرش را خودش داشت و همین باعث شده بود آیکونش سمتِ دیگر و به
 * رنگِ دیگری بنشیند — دقیقاً همان واگرایی‌ای که `DashboardTile` برای جلوگیری از
 * آن ساخته شده بود.
 *
 * تعداد در زیرعنوان می‌آید نه به‌صورت عددِ درشت: عددِ مهمِ این کارت **مبلغ** است،
 * و دو عددِ درشت در یک کارت یعنی هیچ‌کدام برجسته نیست.
 */
const DebtorsCta = ({count, amount, delay = 0}) => {
    const navigate = useNavigate();

    return (
        <DashboardTile
            title="مشتریان بدهکار"
            subtitle={`${toFaDigits(count)} نفر`}
            icon={FiUsers}
            delay={delay}
        >
            <div className="flex-1 flex flex-col justify-between gap-3">
                <p className="m-0 text-[20px] leading-none font-IRANSansXFaNumDemiBold
                              tracking-tight text-var-color-55">
                    {faNumber(amount)}
                    <span className="mr-1.5 text-[11px] font-IRANSansXFaNumLight
                                     text-var-color-04 dark:text-var-color-39">تومان طلب</span>
                </p>

                {/* روی زمینهٔ فیروزه‌ای، متنِ تیره کنتراستِ بیشتری از سفید دارد — همان
                    قاعده‌ای که برای دکمهٔ فیلتر و شمارهٔ صفحهٔ فعال هم به کار رفت */}
                <button
                    type="button"
                    onClick={() => navigate(`${CUSTOMERS_PATH}?filter=debt`)}
                    className="w-full flex flex-row items-center justify-center gap-2 py-2 rounded-xl
                               cursor-pointer text-[13px] transition-all duration-200
                               bg-var-color-15 text-var-color-11 hover:brightness-110 active:scale-[0.98]"
                >
                    مشاهدهٔ فهرست بدهکاران
                    <FiArrowLeft className="w-4 h-4"/>
                </button>
            </div>
        </DashboardTile>
    );
};

export default DebtorsCta;
