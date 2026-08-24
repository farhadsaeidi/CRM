import {Link} from "react-router";
import {FiChevronLeft, FiGrid} from "react-icons/fi";
import {HOME_PATH} from "../../lib/paths.js";

// داشبورد ریشهٔ همهٔ مسیرهاست، پس خودِ کامپوننت آن را می‌گذارد و صفحه‌ها فقط
// ادامهٔ مسیر را می‌دهند. آیکونش همان آیکونِ «داشبورد» در سایدبار است.
const HOME_CRUMB = {label: "داشبورد", to: HOME_PATH, icon: FiGrid};

// ظاهرِ حبه‌ها یکی است و فقط رنگ فرق می‌کند؛ یک‌جا نوشته می‌شود تا لینک و
// حبهٔ فعال از هم واگرا نشوند.
const CHIP = "flex items-center gap-1.5 min-w-0 px-2.5 py-1 rounded-full text-[12.5px] whitespace-nowrap " +
    "transition-colors duration-200";

// همان جفت‌رنگی که آیتمِ فعالِ سایدبار دارد — کاربر همین زبان را آنجا دیده
const CURRENT_CHIP = "bg-var-color-12 dark:bg-var-color-44 text-var-color-19 dark:text-var-color-15 " +
    "font-IRANSansXFaNumMedium cursor-default";

const LINK_CHIP = "no-underline text-var-color-05 dark:text-var-color-39 " +
    "hover:bg-var-color-01 dark:hover:bg-var-color-40 hover:text-var-color-19 dark:hover:text-var-color-15";

/**
 * نوارِ مسیر — می‌گوید کاربر از کجا به اینجا رسیده و هر پله‌اش قابلِ کلیک است.
 *
 * `items` فقط ادامهٔ مسیر بعد از داشبورد است؛ هر آیتم `{label, to, icon}` و
 * آخرین آیتم صفحهٔ جاری است، پس لینک نمی‌شود (به خودش لینک دادن بی‌معناست و
 * `aria-current="page"` هم همین را به صفحه‌خوان می‌گوید).
 *
 * ⚠️ RTL: جداکننده `FiChevronLeft` است نه راست — در راست‌به‌چپ خواندن از راست
 * شروع می‌شود، پس «پلهٔ بعدی» سمتِ چپ است. در DOM هم جداکننده *قبلِ* عنوانش
 * می‌آید، چون اولین فرزندِ فلکس راست‌ترین دیده می‌شود.
 */
const Breadcrumb = ({items = [], className = ""}) => {
    const crumbs = [HOME_CRUMB, ...items];

    return (
        <nav aria-label="مسیر صفحه" className={`shrink-0 min-w-0 mb-3 ${className}`}>
            <ol className="m-0 p-1 list-none flex flex-row items-center gap-0.5 w-fit max-w-full
                           rounded-full bg-var-color-00 dark:bg-var-color-36
                           border border-var-color-02 dark:border-var-color-38">
                {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1;
                    const Icon = crumb.icon;
                    return (
                        // ورودِ پلکانی: مسیر از ریشه به سمتِ صفحهٔ جاری «کشیده» می‌شود
                        <li key={crumb.to ?? crumb.label}
                            className="flex items-center gap-0.5 min-w-0 animate-fade-up"
                            style={{animationDelay: `${index * 60}ms`}}>
                            {index > 0 && (
                                <FiChevronLeft aria-hidden="true"
                                               className="w-3.5 h-3.5 shrink-0 text-var-color-03 dark:text-var-color-05"/>
                            )}
                            {isLast ? (
                                <span aria-current="page" className={`${CHIP} ${CURRENT_CHIP}`}>
                                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0"/>}
                                    <span className="truncate">{crumb.label}</span>
                                </span>
                            ) : (
                                <Link to={crumb.to} className={`${CHIP} ${LINK_CHIP}`}>
                                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0"/>}
                                    <span className="truncate">{crumb.label}</span>
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumb;
