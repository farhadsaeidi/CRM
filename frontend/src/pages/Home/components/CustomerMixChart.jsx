import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
import {faNumber, toFaDigits} from "../../../lib/chart.js";

/**
 * ترکیبِ وضعیتِ حسابِ مشتریان — دوناتِ وسط‌خالی با مجموع در مرکز، مثل عکسِ مرجع.
 *
 * ⚠️ چهار بخش دارد نه سه. ستونِ کش‌شدهٔ `Customer.code` «بی‌حساب» را یکی می‌بیند،
 * ولی «تسویه کرده» و «اصلاً معامله‌ای نکرده» دو چیزِ کاملاً متفاوت‌اند و اقدامِ
 * لازم برایشان یکی نیست. سرور هم به همین دلیل این عدد را از روی تراکنش‌های
 * همین مالک حساب می‌کند نه از آن ستون.
 */

const SLICES = [
    {key: "debt", label: "بدهکار", color: "var(--color-var-color-55)"},
    {key: "credit", label: "بستانکار", color: "var(--color-var-color-31)"},
    {key: "settled", label: "تسویه‌شده", color: "var(--color-var-color-15)"},
    {key: "untouched", label: "بدون تراکنش", color: "var(--chart-muted)"},
];

const CustomTooltip = ({active, payload}) => {
    if (!active || !payload?.length) return null;
    const slice = payload[0].payload;
    return (
        <div className="rounded-xl px-3 py-2 text-[12px] backdrop-blur
                        bg-var-color-00/95 dark:bg-var-color-37/95
                        border border-var-color-02 dark:border-var-color-38
                        shadow-[0_18px_40px_-18px_rgba(15,23,42,0.45)]">
            <span className="flex flex-row items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{background: slice.color}}/>
                <span className="text-var-color-04 dark:text-var-color-39">{slice.label}</span>
                <span className="mr-auto font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">
                    {toFaDigits(slice.value)} نفر
                </span>
            </span>
        </div>
    );
};

const CustomerMixChart = ({mix}) => {
    const data = SLICES
        .map((slice) => ({...slice, value: mix[slice.key] ?? 0}))
        .filter((slice) => slice.value > 0);
    const total = mix.total ?? 0;

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <div className="relative h-44 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={150}>
                    <PieChart>
                        <Tooltip content={<CustomTooltip/>}/>
                        <Pie data={data} dataKey="value" nameKey="label"
                             innerRadius="62%" outerRadius="92%" paddingAngle={2.5}
                             startAngle={90} endAngle={-270} stroke="none"
                             isAnimationActive animationDuration={800} animationEasing="ease-out">
                            {data.map((slice) => <Cell key={slice.key} fill={slice.color}/>)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* مجموع در مرکزِ دونات. pointer-events-none لازم است وگرنه جلوی
                    تولتیپِ بخش‌های زیرش را می‌گیرد. */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <strong className="text-[24px] leading-none font-IRANSansXFaNumDemiBold
                                       text-var-color-08 dark:text-var-color-01">
                        {toFaDigits(total)}
                    </strong>
                    <span className="mt-1 text-[10.5px] text-var-color-04 dark:text-var-color-39">مشتری</span>
                </div>
            </div>

            {/* لجندِ شمارشی زیرِ دونات — همان چیدمانِ عکسِ مرجع */}
            <ul className="m-0 mt-3 p-0 list-none grid grid-cols-2 gap-x-3 gap-y-2">
                {SLICES.map((slice) => (
                    <li key={slice.key} className="flex flex-row items-center gap-1.5 min-w-0 text-[11.5px]">
                        <span className="w-2 h-2 shrink-0 rounded-full" style={{background: slice.color}}/>
                        <span className="truncate text-var-color-04 dark:text-var-color-39">{slice.label}</span>
                        <span className="mr-auto shrink-0 font-IRANSansXFaNumMedium
                                         text-var-color-06 dark:text-var-color-01">
                            {faNumber(mix[slice.key] ?? 0)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CustomerMixChart;
