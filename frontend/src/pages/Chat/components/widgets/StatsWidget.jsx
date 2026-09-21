import {BADGE_CLASS, TONE_TEXT, formatValue, unitOf} from "./widgetFormat.js";
import WidgetFrame from "./WidgetFrame.jsx";

/**
 * کارتِ چند عدد — نمای کلی، وضعیتِ مشتریان، حسابِ یک مشتری.
 *
 * ⚠️ کاشی‌ها خانهٔ جدا دارند نه خطِ جداکننده: با `gap-px` روی زمینهٔ رنگی، خانهٔ
 * خالیِ ردیفِ آخر (پنج عدد در گریدِ دو یا سه‌ستونه) یک مستطیلِ توپر به رنگِ
 * خط می‌شد.
 */
const StatsWidget = ({widget}) => (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle} link={widget.link}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-2.5 pb-2.5">
            {(widget.items ?? []).map((item) => {
                const unit = unitOf(item.format, item.unit);
                return (
                    <div key={item.label} className="rounded-xl px-3 py-2.5 bg-var-color-01 dark:bg-var-color-36">
                        <p className="m-0 text-[11px] text-var-color-04 dark:text-var-color-39">{item.label}</p>
                        <p className="m-0 mt-1 flex flex-row flex-wrap items-baseline gap-x-1 gap-y-0.5">
                            <span className={`text-[15px] font-IRANSansXFaNumMedium
                                              ${TONE_TEXT[item.tone] ?? "text-var-color-06 dark:text-var-color-01"}`}>
                                {formatValue(item.value, item.format)}
                            </span>
                            {unit && item.value !== null && item.value !== undefined && (
                                <span className="text-[10.5px] text-var-color-04 dark:text-var-color-39">{unit}</span>
                            )}
                            {item.badge && (
                                <span className={`px-1.5 py-px rounded-md text-[10.5px]
                                                  ${BADGE_CLASS[item.badge.tone ?? "none"]}`}>
                                    {item.badge.text}
                                </span>
                            )}
                        </p>
                        {item.sub && (
                            <p className="m-0 mt-0.5 text-[10.5px] text-var-color-04 dark:text-var-color-39">
                                {formatValue(item.sub.value, item.sub.format)} {unitOf(item.sub.format, item.sub.unit)}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    </WidgetFrame>
);

export default StatsWidget;
