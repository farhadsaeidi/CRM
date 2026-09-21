import {
    Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,
    Tooltip, XAxis, YAxis,
} from "recharts";
import {AXIS_TICK, SERIES, faCompact, faPercent, toFaDigits} from "../../../lib/chart.js";
import {formatValue, unitOf} from "../components/widgets/widgetFormat.js";

/**
 * نمودارهای رابطی که مدل می‌سازد — میله‌ای، خطی و دونات.
 *
 * ⚠️ **این فایل تنبل بارگذاری می‌شود** (`components.jsx`): recharts حدودِ صد
 * کیلوبایتِ فشرده است و فقط وقتی به صفحهٔ گفتگو می‌آید که جوابی واقعاً نمودار
 * داشته باشد — همان تصمیمی که داشبورد را جدا بارگذاری می‌کند.
 *
 * زبانِ ظاهری همان نمودارهای داشبورد است: همان توکن‌های محور و شبکه، همان رنگِ
 * نسیه و وصولی، و همان قاعدهٔ RTL (محورِ عدد سمتِ راست، جهتِ پیشروی راست‌به‌چپ).
 */

// رنگِ معنادار از `SERIES` — «نسیه» در هر نموداری یک رنگ است
const TONE_COLOR = {debt: SERIES.debt, credit: SERIES.paid, accent: SERIES.balance};

// ⚠️ رنگِ دسته‌ای از اکسنت نمی‌آید (همان قاعدهٔ کاشی‌های داشبورد): با پالتِ صورتی،
// سری‌ای که اکسنت می‌گرفت کنارِ سریِ «بدهکار» هم‌رنگ می‌شد
const PALETTE = ["var(--color-var-color-50)", "var(--color-var-color-32)", "var(--color-var-color-25)",
                 "var(--color-var-color-53)", "var(--chart-muted)"];

// قاچ‌های دونات اگر وضعیتِ حساب باشند، رنگِ همان وضعیت را می‌گیرند
const STATUS_COLOR = {
    "بدهکار": "var(--color-var-color-55)",
    "بستانکار": "var(--color-var-color-31)",
    "تسویه‌شده": "var(--color-var-color-50)",
    "بی حساب": "var(--color-var-color-53)",
    "بدون تراکنش": "var(--chart-muted)",
};

const seriesColor = (series, index) => TONE_COLOR[series.tone] ?? PALETTE[index % PALETTE.length];

// محورِ عدد جا ندارد: مبلغ و شمارش فشرده، درصد با علامت
const axisFormatter = (format) => (value) =>
    format === "percent" ? faPercent(value) : faCompact(value);

// برچسبِ بلندِ محورِ دسته (نامِ مشتری) کوتاه می‌شود؛ نامِ کامل در تولتیپ است
const shortLabel = (label) => {
    const text = toFaDigits(label ?? "");
    return text.length > 14 ? `${text.slice(0, 13)}…` : text;
};

const ChartTooltip = ({active, payload, label, format}) => {
    if (!active || !payload?.length) return null;
    const unit = unitOf(format);
    return (
        <div className="rounded-xl px-3 py-2.5 text-[12px] backdrop-blur
                        bg-var-color-00/95 dark:bg-var-color-37/95
                        border border-var-color-02 dark:border-var-color-38
                        shadow-[0_18px_40px_-18px_rgba(15,23,42,0.45)]">
            {label !== undefined && (
                <p className="m-0 mb-1.5 font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">
                    {toFaDigits(label)}
                </p>
            )}
            {payload.map((item) => (
                <p key={item.dataKey ?? item.name} className="m-0 flex flex-row items-center gap-2 leading-6">
                    <span className="w-2 h-2 rounded-full shrink-0"
                          style={{background: item.color ?? item.payload?.color}}/>
                    <span className="text-var-color-04 dark:text-var-color-39">{item.name}</span>
                    <span className="mr-auto font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">
                        {formatValue(item.value, format)} {unit}
                    </span>
                </p>
            ))}
        </div>
    );
};

const renderLegend = ({payload}) => (
    <ul className="m-0 mt-1 p-0 list-none flex flex-row flex-wrap items-center justify-center gap-4 text-[11px]">
        {payload.map((item) => (
            <li key={item.dataKey ?? item.value} className="flex flex-row items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{background: item.color}}/>
                <span className="text-var-color-04 dark:text-var-color-39">{item.value}</span>
            </li>
        ))}
    </ul>
);

// ردیف‌های recharts از ستون‌های جدا: برچسب‌ها و آرایهٔ هر سری
const rowsOf = (labels, series) => labels.map((label, i) => ({
    label,
    ...Object.fromEntries(series.map((s, j) => [`s${j}`, Number(s.values?.[i]) || 0])),
}));

/**
 * ⚠️ **میله‌ها افقی‌اند، همیشه.** برچسبِ این نمودارها معمولاً نامِ مشتری است و
 * زیرِ میله‌های عمودی یا روی هم می‌افتاد یا مورب می‌شد؛ افقی، هر نام خطِ خودش را
 * دارد. محورِ عدد `reversed` است تا میله‌ها از راست رشد کنند.
 */
const HorizontalBars = ({labels, series, format}) => {
    const data = rowsOf(labels, series);
    return (
        <ResponsiveContainer width="100%" height={Math.max(140, data.length * 34 + 40)} minWidth={0}>
            <BarChart data={data} layout="vertical" margin={{top: 4, right: 4, left: 8, bottom: 0}}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 10" horizontal={false}/>
                <XAxis type="number" reversed axisLine={false} tickLine={false} tick={AXIS_TICK}
                       tickFormatter={axisFormatter(format)} tickCount={4}/>
                <YAxis type="category" dataKey="label" orientation="right" width={104} axisLine={false}
                       tickLine={false} tick={AXIS_TICK} tickFormatter={shortLabel} interval={0}/>
                <Tooltip content={<ChartTooltip format={format}/>}
                         cursor={{fill: "var(--chart-grid)", opacity: 0.35}}/>
                {series.length > 1 && <Legend content={renderLegend} verticalAlign="bottom" height={26}/>}
                {series.map((s, i) => (
                    // گوشهٔ گرد در انتهای میله است، یعنی سمتِ چپ
                    <Bar key={i} dataKey={`s${i}`} name={s.name} fill={seriesColor(s, i)} barSize={14}
                         radius={[6, 0, 0, 6]} isAnimationActive animationDuration={700}/>
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
};

// ⚠️ محورِ افقی `reversed`: ماهِ قدیمی راست و ماهِ تازه چپ، همان جهتِ خواندن
const Lines = ({labels, series, format}) => (
    <ResponsiveContainer width="100%" height={220} minWidth={0}>
        <LineChart data={rowsOf(labels, series)} margin={{top: 8, right: 4, left: 4, bottom: 0}}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 10" vertical={false}/>
            <XAxis dataKey="label" reversed axisLine={false} tickLine={false} tick={AXIS_TICK} tickMargin={10}
                   tickFormatter={toFaDigits} interval="preserveStartEnd"/>
            <YAxis orientation="right" width={54} axisLine={false} tickLine={false} tick={AXIS_TICK}
                   tickFormatter={axisFormatter(format)} tickCount={5}/>
            <Tooltip content={<ChartTooltip format={format}/>}
                     cursor={{stroke: "var(--chart-axis)", strokeDasharray: "4 6"}}/>
            {series.length > 1 && <Legend content={renderLegend} verticalAlign="bottom" height={26}/>}
            {series.map((s, i) => (
                <Line key={i} type="monotone" dataKey={`s${i}`} name={s.name} stroke={seriesColor(s, i)}
                      strokeWidth={2.2} dot={false} activeDot={{r: 4}} isAnimationActive animationDuration={700}/>
            ))}
        </LineChart>
    </ResponsiveContainer>
);

// همان دوناتِ داشبورد: مجموع در مرکز و لجندِ شمارشی زیرش
const Donut = ({labels, values, format}) => {
    const slices = labels.map((label, i) => ({
        label, value: Number(values[i]) || 0,
        color: STATUS_COLOR[label] ?? PALETTE[i % PALETTE.length],
    }));
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    const visible = slices.filter((slice) => slice.value > 0);
    return (
        <div className="flex flex-col">
            <div className="relative h-44 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={150}>
                    <PieChart>
                        <Tooltip content={<ChartTooltip format={format}/>}/>
                        <Pie data={visible} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="92%"
                             paddingAngle={2.5} startAngle={90} endAngle={-270} stroke="none"
                             isAnimationActive animationDuration={800} animationEasing="ease-out">
                            {visible.map((slice) => <Cell key={slice.label} fill={slice.color}/>)}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                {/* pointer-events-none وگرنه جلوی تولتیپِ قاچ‌های زیرش را می‌گیرد */}
                <strong className="pointer-events-none absolute inset-0 flex items-center justify-center
                                   text-[20px] font-IRANSansXFaNumDemiBold text-var-color-08 dark:text-var-color-01">
                    {formatValue(total, format)}
                </strong>
            </div>
            <ul className="m-0 mt-3 p-0 list-none grid grid-cols-2 gap-x-3 gap-y-2">
                {slices.map((slice) => (
                    <li key={slice.label} className="flex flex-row items-center gap-1.5 min-w-0 text-[11.5px]">
                        <span className="w-2 h-2 shrink-0 rounded-full" style={{background: slice.color}}/>
                        <span className="truncate text-var-color-04 dark:text-var-color-39">{toFaDigits(slice.label)}</span>
                        <span className="mr-auto shrink-0 font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">
                            {formatValue(slice.value, format)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const UiChart = ({kind, labels, series, values, format}) => {
    if (kind === "donut") return <Donut labels={labels} values={values} format={format}/>;
    if (kind === "line") return <Lines labels={labels} series={series} format={format}/>;
    return <HorizontalBars labels={labels} series={series} format={format}/>;
};

export default UiChart;
