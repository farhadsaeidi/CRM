import {FiRefreshCw} from "react-icons/fi";
import {DASHBOARD_PERIODS} from "../../../api/dashboard.js";

/**
 * نوارِ بالای داشبورد — انتخابِ دوره و بازخوانی.
 *
 * انتخابگر به‌جای منوی کشویی یک گروهِ قرصی‌شکل است: پنج گزینهٔ ثابت که همیشه
 * دیده شوند سریع‌تر از منویی است که باید باز شود، و همان لهجهٔ چیپِ «خرداد» را
 * دارد که در داشبوردهای مرجع روی هر کارتِ نمودار نشسته.
 */
const DashboardToolbar = ({period, onPeriod, onRefresh, loading, todayLabel}) => (
    <div className="shrink-0 flex flex-row flex-wrap items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
            <h2 className="m-0 text-[17px] font-MorabbaMedium dark:font-MorabbaLight tracking-wide
                           text-var-color-08 dark:text-var-color-01">
                نمای کلی دفتر
            </h2>
            <p className="m-0 mt-0.5 text-[11px] text-var-color-04 dark:text-var-color-39">{todayLabel}</p>
        </div>

        <div className="flex flex-row items-center gap-2">
            <div className="flex flex-row items-center gap-0.5 p-1 rounded-full
                            bg-var-color-01 dark:bg-var-color-40
                            border border-var-color-02 dark:border-var-color-38">
                {DASHBOARD_PERIODS.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onPeriod(item.key)}
                        className={`px-2.5 py-1 rounded-full text-[11.5px] cursor-pointer whitespace-nowrap
                                    transition-colors duration-200 ${
                            item.key === period
                                ? "bg-var-color-15 text-var-color-11 font-IRANSansXFaNumMedium"
                                : "text-var-color-05 dark:text-var-color-39 hover:text-var-color-15"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            <button
                type="button"
                aria-label="بازخوانی داشبورد"
                onClick={onRefresh}
                disabled={loading}
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center cursor-pointer
                           border transition-colors duration-200
                           bg-var-color-00 dark:bg-var-color-36
                           border-var-color-02 dark:border-var-color-38
                           text-var-color-05 dark:text-var-color-39
                           enabled:hover:bg-var-color-12 dark:enabled:hover:bg-var-color-44
                           enabled:hover:border-var-color-13 dark:enabled:hover:border-var-color-16
                           enabled:hover:text-var-color-15
                           disabled:cursor-default"
            >
                {/* چرخشِ آیکون تنها نشانهٔ «در حال به‌روزرسانی» است؛ داده‌های قبلی
                    سرِ جایشان می‌مانند و صفحه خالی نمی‌شود */}
                <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}/>
            </button>
        </div>
    </div>
);

export default DashboardToolbar;
