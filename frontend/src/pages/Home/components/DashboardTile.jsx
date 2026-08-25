import {TbMoodNeutral} from "react-icons/tb";

/**
 * قابِ مشترکِ همهٔ کاشی‌های داشبورد.
 *
 * یک‌جا تعریف شده تا دوازده کاشی از هم واگرا نشوند — همان ایرادی که در پروژهٔ
 * قدیمی هر کارت را کمی متفاوت کرده بود.
 *
 * ورودِ پلکانی با `delay` انجام می‌شود: کاشی‌ها یکی‌یکی بالا می‌آیند نه همه با هم.
 * چون والد با هر بازخوانی `key` را عوض می‌کند، همین انیمیشن با هر تغییرِ داده
 * دوباره پخش می‌شود.
 */
const DashboardTile = ({
    title, subtitle, icon: Icon, action, children,
    className = "", delay = 0,
    // حالتِ خالی از اول طراحی شده، نه به‌عنوان وصله: هر مالکِ تازه‌وارد کلِ
    // داشبورد را خالی می‌بیند و نباید با کارت‌های شکسته روبه‌رو شود.
    empty = false, emptyText = "هنوز داده‌ای برای نمایش نیست",
}) => (
    <section
        style={{animationDelay: `${delay}ms`}}
        className={`animate-fade-up min-w-0 flex flex-col rounded-[18px] p-4
                    bg-var-color-00 dark:bg-var-color-36
                    border border-var-color-02 dark:border-var-color-38 ${className}`}
    >
        <header className="shrink-0 flex flex-row items-center justify-between gap-3 mb-3.5">
            <div className="flex flex-row items-center gap-2 min-w-0">
                {Icon && (
                    <span className="w-7 h-7 shrink-0 rounded-[10px] flex items-center justify-center
                                     bg-var-color-12 dark:bg-var-color-44 text-var-color-15">
                        <Icon className="w-4 h-4"/>
                    </span>
                )}
                <div className="min-w-0">
                    <h3 className="m-0 text-[13.5px] font-IRANSansXFaNumMedium truncate
                                   text-var-color-06 dark:text-var-color-01">{title}</h3>
                    {subtitle && (
                        <p className="m-0 mt-0.5 text-[10.5px] truncate text-var-color-04 dark:text-var-color-39">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {action}
        </header>

        {empty ? (
            <div className="flex-1 min-h-24 flex flex-col items-center justify-center gap-2 py-6 text-center">
                <TbMoodNeutral className="w-7 h-7 text-var-color-03 dark:text-var-color-05"/>
                <p className="m-0 text-[12px] text-var-color-04 dark:text-var-color-39">{emptyText}</p>
            </div>
        ) : children}
    </section>
);

export default DashboardTile;
