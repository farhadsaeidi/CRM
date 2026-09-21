import {BADGE_CLASS, TONE_TEXT, formatValue, unitOf} from "./widgetFormat.js";

/**
 * یک کاشیِ عدد: برچسب، مقدار، واحد و برچسبِ وضعیت.
 *
 * مشترکِ دو جاست — ویجتِ ثابتِ فاز صفر (`StatsWidget`) و `Kpi`ِ رابطی که مدل
 * می‌سازد (`openui/`). یک نسخه، تا یک عدد در یک گفتگو دو شکل نداشته باشد.
 *
 * `loading`: دادهٔ Query هنوز نرسیده. به‌جای «—» یک نوارِ لرزان می‌نشیند؛ «—»
 * یعنی «داده‌ای نیست»، و نشان دادنش پیش از رسیدنِ داده دروغِ کوچکی بود.
 */
const StatTile = ({label, value, format, unit, tone, badge, sub, loading = false}) => {
    const shownUnit = unitOf(format, unit);
    return (
        <div className="rounded-xl px-3 py-2.5 bg-var-color-01 dark:bg-var-color-36">
            <p className="m-0 text-[11px] text-var-color-04 dark:text-var-color-39">{label}</p>
            {loading ? (
                <span className="block mt-2 mb-0.5 h-3.5 w-20 rounded-md animate-pulse
                                 bg-var-color-02 dark:bg-var-color-38"/>
            ) : (
                <p className="m-0 mt-1 flex flex-row flex-wrap items-baseline gap-x-1 gap-y-0.5">
                    <span className={`text-[15px] font-IRANSansXFaNumMedium
                                      ${TONE_TEXT[tone] ?? "text-var-color-06 dark:text-var-color-01"}`}>
                        {formatValue(value, format)}
                    </span>
                    {shownUnit && value !== null && value !== undefined && (
                        <span className="text-[10.5px] text-var-color-04 dark:text-var-color-39">{shownUnit}</span>
                    )}
                    {badge && (
                        <span className={`px-1.5 py-px rounded-md text-[10.5px]
                                          ${BADGE_CLASS[badge.tone ?? "none"]}`}>
                            {badge.text}
                        </span>
                    )}
                </p>
            )}
            {sub && (
                <p className="m-0 mt-0.5 text-[10.5px] text-var-color-04 dark:text-var-color-39">
                    {formatValue(sub.value, sub.format)} {unitOf(sub.format, sub.unit)}
                </p>
            )}
        </div>
    );
};

export default StatTile;
