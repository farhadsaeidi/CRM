import {Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {AGING_COLORS, AXIS_TICK, faCompact, faNumber, toFaDigits} from "../../../lib/chart.js";

/**
 * سررسیدِ بدهی — مبلغِ طلب در چهار سطلِ سنی.
 *
 * کلاسیک‌ترین تحلیلِ حساب‌های دریافتنی و کاربردی‌ترین کاشیِ این داشبورد: طلبی که
 * بیش از ۹۰ روز مانده، عملاً وصولش سخت شده. رنگ‌ها عمداً از سبز به قرمز می‌روند
 * تا شدت بدونِ خواندنِ برچسب هم دیده شود.
 *
 * ⚠️ RTL: محورِ افقی `reversed` تا سطلِ «تازه» سمتِ راست (شروعِ خط) بنشیند.
 */

const CustomTooltip = ({active, payload}) => {
    if (!active || !payload?.length) return null;
    const bucket = payload[0].payload;
    return (
        <div className="rounded-xl px-3 py-2 text-[12px] backdrop-blur
                        bg-var-color-00/95 dark:bg-var-color-37/95
                        border border-var-color-02 dark:border-var-color-38
                        shadow-[0_18px_40px_-18px_rgba(15,23,42,0.45)]">
            <p className="m-0 mb-1 font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">
                {bucket.label}
            </p>
            <p className="m-0 text-var-color-04 dark:text-var-color-39">
                {faNumber(bucket.amount)} تومان
                <span className="mr-2">({toFaDigits(bucket.count)} مشتری)</span>
            </p>
        </div>
    );
};

const AgingChart = ({data}) => (
    <div className="flex-1 min-h-0 w-full min-w-0 h-52">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
            <BarChart data={data} margin={{top: 24, right: 4, left: 4, bottom: 0}} barCategoryGap="28%">
                <XAxis dataKey="label" reversed axisLine={false} tickLine={false}
                       tick={AXIS_TICK} tickMargin={8} interval={0}/>
                <YAxis hide domain={[0, "dataMax * 1.25"]}/>
                <Tooltip content={<CustomTooltip/>} cursor={{fill: "var(--chart-cursor)", radius: 10}}/>
                <Bar dataKey="amount" radius={[10, 10, 4, 4]}
                     isAnimationActive animationDuration={750} animationEasing="ease-out">
                    {data.map((bucket, index) => (
                        <Cell key={bucket.label} fill={AGING_COLORS[index % AGING_COLORS.length]}/>
                    ))}
                    <LabelList dataKey="amount" position="top" offset={8}
                               formatter={(value) => (value ? faCompact(value) : "")}
                               fill="var(--chart-axis)" fontSize={11}/>
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export default AgingChart;
