import {faNumber, faPercent} from "../../../lib/chart.js";

/**
 * تمرکزِ دفتر — چند درصدِ گردش نزدِ پرمعامله‌ترین مشتری است.
 *
 * تنها کاشیِ صرفاً تحلیلیِ داشبورد و به نظرم پرارزش‌ترینشان: اگر نیمی از گردشِ
 * یک کسب‌وکار به یک نفر بند باشد، رفتنِ آن یک نفر یعنی نصف شدنِ دفتر. هیچ‌کدام
 * از داشبوردهای مرجع چنین چیزی ندارند چون فروشگاه‌اند نه دفترِ حساب.
 */

const SEGMENTS = [
    {key: "top1", label: "نفرِ نخست", color: "var(--color-var-color-15)"},
    {key: "rest3", label: "دو نفرِ بعد", color: "var(--color-var-color-14)"},
    {key: "rest", label: "بقیهٔ مشتریان", color: "var(--chart-muted)"},
];

const ConcentrationCard = ({data}) => {
    // top3 شاملِ نفرِ اول هم هست؛ سهمِ «دو نفرِ بعد» تفاضلشان است
    const segments = {
        top1: data.top1,
        rest3: Math.max(0, Math.round((data.top3 - data.top1) * 10) / 10),
        rest: data.rest,
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col justify-center gap-4">
            <div className="flex flex-row items-end gap-2 min-w-0">
                <strong className="text-[34px] leading-none font-IRANSansXFaNumDemiBold tracking-tight
                                   text-var-color-15">
                    {faPercent(data.top1)}
                </strong>
                <p className="m-0 pb-1 text-[12px] leading-5 text-var-color-04 dark:text-var-color-39 min-w-0">
                    از گردشِ دفتر نزدِ{" "}
                    <span className="text-var-color-06 dark:text-var-color-01">
                        {data.top1_name ?? "—"}
                    </span>{" "}
                    است
                </p>
            </div>

            {/* نوارِ سه‌بخشی. flex-row در RTL از راست شروع می‌شود، پس نفرِ اول
                خودبه‌خود سمتِ راست می‌نشیند — همان‌جایی که چشم اول می‌رود. */}
            <div className="flex flex-row h-2.5 w-full rounded-full overflow-hidden gap-0.5">
                {SEGMENTS.map((segment) => (
                    <span key={segment.key}
                          title={segment.label}
                          style={{width: `${segments[segment.key]}%`, background: segment.color}}
                          className="h-full first:rounded-r-full last:rounded-l-full
                                     transition-[width] duration-700 ease-out"/>
                ))}
            </div>

            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                {SEGMENTS.map((segment) => (
                    <li key={segment.key} className="flex flex-row items-center gap-1.5 text-[11.5px] min-w-0">
                        <span className="w-2 h-2 shrink-0 rounded-full" style={{background: segment.color}}/>
                        <span className="truncate text-var-color-04 dark:text-var-color-39">{segment.label}</span>
                        <span className="mr-auto shrink-0 font-IRANSansXFaNumMedium
                                         text-var-color-06 dark:text-var-color-01">
                            {faPercent(segments[segment.key])}
                        </span>
                    </li>
                ))}
            </ul>

            <p className="m-0 pt-2 text-[10.5px] border-t border-var-color-02 dark:border-var-color-38
                          text-var-color-04 dark:text-var-color-39">
                گردشِ کلِ دفتر: {faNumber(data.total)} تومان
            </p>
        </div>
    );
};

export default ConcentrationCard;
