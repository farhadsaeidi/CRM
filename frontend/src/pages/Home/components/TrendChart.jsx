import {
    Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {AXIS_TICK, SERIES, faCompact, faNumber} from "../../../lib/chart.js";

/**
 * روندِ نسیه، وصولی و ماندهٔ تجمعی در دوازده ماهِ شمسیِ گذشته.
 *
 * چرا ترکیبی؟ نسیه و وصولی دو جریانِ ماهانه‌اند (سطح/ناحیه خوانا نشانشان می‌دهد)
 * ولی مانده یک انباشت است و باید خط باشد — کشیدنِ هر سه به یک شکل، سه چیزِ
 * متفاوت را یکسان جلوه می‌داد.
 *
 * ⚠️ RTL: محورِ افقی `reversed` است تا ماهِ قدیمی سمتِ راست و ماهِ جاری سمتِ چپ
 * بنشیند، و محورِ عمودی `orientation="right"`. بدونِ این، نمودار برعکسِ جهتِ
 * خواندنِ صفحه پیش می‌رود.
 */

const CustomTooltip = ({active, payload, label}) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl px-3 py-2.5 text-[12px] backdrop-blur
                        bg-var-color-00/95 dark:bg-var-color-37/95
                        border border-var-color-02 dark:border-var-color-38
                        shadow-[0_18px_40px_-18px_rgba(15,23,42,0.45)]">
            <p className="m-0 mb-1.5 font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">{label}</p>
            {payload.map((item) => (
                <p key={item.dataKey} className="m-0 flex flex-row items-center gap-2 leading-6">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background: item.color}}/>
                    <span className="text-var-color-04 dark:text-var-color-39">{item.name}</span>
                    <span className="mr-auto font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">
                        {faNumber(item.value)}
                    </span>
                </p>
            ))}
        </div>
    );
};

const renderLegend = ({payload}) => (
    <ul className="m-0 mt-1 p-0 list-none flex flex-row flex-wrap items-center justify-center gap-4 text-[11px]">
        {payload.map((item) => (
            <li key={item.dataKey} className="flex flex-row items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{background: item.color}}/>
                <span className="text-var-color-04 dark:text-var-color-39">{item.value}</span>
            </li>
        ))}
    </ul>
);

const TrendChart = ({data}) => (
    <div className="flex-1 min-h-0 w-full min-w-0 h-64">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
            <ComposedChart data={data} margin={{top: 8, right: 4, left: 4, bottom: 0}}>
                <defs>
                    {/* گرادیانِ عمودی زیر هر ناحیه — همان عمقی که کارت‌های مرجع دارند */}
                    <linearGradient id="crm-debt-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES.debt} stopOpacity={0.28}/>
                        <stop offset="100%" stopColor={SERIES.debt} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="crm-paid-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES.paid} stopOpacity={0.28}/>
                        <stop offset="100%" stopColor={SERIES.paid} stopOpacity={0}/>
                    </linearGradient>
                </defs>

                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 10" vertical={false}/>
                <XAxis dataKey="label" reversed axisLine={false} tickLine={false}
                       tick={AXIS_TICK} tickMargin={10} interval="preserveStartEnd"/>
                <YAxis orientation="right" width={54} axisLine={false} tickLine={false}
                       tick={AXIS_TICK} tickFormatter={faCompact} tickCount={5}/>
                <Tooltip content={<CustomTooltip/>} cursor={{stroke: "var(--chart-axis)", strokeDasharray: "4 6"}}/>
                <Legend content={renderLegend} verticalAlign="bottom" height={26}/>

                <Area type="monotone" dataKey="debt" name="نسیه" stroke={SERIES.debt} strokeWidth={2}
                      fill="url(#crm-debt-fill)" isAnimationActive animationDuration={700} animationEasing="ease-out"/>
                <Area type="monotone" dataKey="paid" name="وصولی" stroke={SERIES.paid} strokeWidth={2}
                      fill="url(#crm-paid-fill)" isAnimationActive animationDuration={700} animationBegin={120}
                      animationEasing="ease-out"/>
                <Line type="monotone" dataKey="balance" name="مانده" stroke={SERIES.balance} strokeWidth={2.5}
                      strokeDasharray="6 5" dot={false}
                      activeDot={{r: 4, strokeWidth: 2, stroke: "var(--chart-tooltip-bg)"}}
                      isAnimationActive animationDuration={800} animationBegin={240}/>
            </ComposedChart>
        </ResponsiveContainer>
    </div>
);


export default TrendChart;
