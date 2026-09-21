import {Fragment, Suspense, lazy} from "react";
import {useIsQueryLoading, useStateField} from "@openuidev/react-lang";
import {toFaDigits} from "../../../lib/chart.js";
import DataTable from "../components/widgets/DataTable.jsx";
import StatTile from "../components/widgets/StatTile.jsx";
import WidgetFrame from "../components/widgets/WidgetFrame.jsx";
import {TILE_GRID, statusTone} from "../components/widgets/widgetFormat.js";

/**
 * رندرکننده‌های کامپوننت‌هایی که مدل در جوابِ گفتگو می‌سازد (تعریف‌ها: `defs.js`).
 *
 * ⚠️ **هیچ ظاهرِ تازه‌ای اینجا ساخته نمی‌شود.** کارت، کاشیِ عدد و جدول همان
 * قطعه‌های ویجت‌های ثابتِ فاز صفرند (`WidgetFrame`، `StatTile`، `DataTable`)، پس
 * جوابی که مدل چیده با جوابی که سرور چیده یک خانواده دیده می‌شود.
 *
 * هر رندرکننده `{props, renderNode}` می‌گیرد و props از قبل با دادهٔ Query پر
 * شده‌اند. `Col` و `CustomerCol` و `Series` و `Option` رندرکننده ندارند: دادهٔ
 * والدشان‌اند و والد مستقیم از `props`شان می‌خواند.
 */

const UiChart = lazy(() => import("./UiChart.jsx"));

const asArray = (value) => (Array.isArray(value) ? value : []);
const specOf = (node) => node?.props ?? {};

// ریشه: کارت‌ها زیرِ هم. بلوکی که مدل بیرونِ Card گذاشته هم قابِ بی‌عنوان می‌گیرد،
// وگرنه یک جدولِ لخت بی‌بوردر وسطِ گفتگو می‌نشست
export const UiStack = ({props, renderNode}) => (
    <div className="flex flex-col gap-2.5">
        {asArray(props.children).map((child, index) => (
            child?.typeName === "Card"
                ? <Fragment key={index}>{renderNode(child)}</Fragment>
                : <WidgetFrame key={index}><div className="pt-2.5">{renderNode(child)}</div></WidgetFrame>
        ))}
    </div>
);

// بلوک‌های داخلِ کارت فاصلهٔ پایینِ خودشان را دارند (همان قراردادِ فاز صفر)، پس
// کارت فقط زیرِ هم می‌چیند
export const UiCard = ({props, renderNode}) => (
    <WidgetFrame title={props.title} subtitle={props.subtitle}>
        {renderNode(props.children)}
    </WidgetFrame>
);

export const UiKpiGrid = ({props, renderNode}) => (
    <div className={TILE_GRID}>{renderNode(props.items)}</div>
);

export const UiKpi = ({props}) => {
    const loading = useIsQueryLoading();
    const missing = props.value === null || props.value === undefined;
    // وضعیت («بدهکار» و…) متن است ولی رنگِ معنادارش را می‌گیرد
    const status = props.format === "status";
    return (
        <StatTile label={props.label} value={props.value} loading={loading && missing}
                  format={status ? "text" : props.format ?? "count"}
                  tone={status ? statusTone(String(props.value ?? "")) : props.tone}/>
    );
};

export const UiTable = ({props}) => {
    const loading = useIsQueryLoading();
    // هر ستون آرایهٔ خودش را دارد (`q.rows.name`)؛ ردیف‌ها از کنارِ هم گذاشتنشان ساخته می‌شوند
    const nodes = asArray(props.columns).filter(Boolean);
    const columns = nodes.map((node, i) => {
        const spec = specOf(node);
        return node.typeName === "CustomerCol"
            ? {key: `c${i}`, idKey: `c${i}_id`, label: spec.label, kind: "customer"}
            : {key: `c${i}`, label: spec.label, kind: spec.format ?? "text", tone: spec.tone};
    });
    const values = nodes.map((node) => asArray(node.typeName === "CustomerCol" ? specOf(node).names
                                                                               : specOf(node).values));
    const ids = nodes.map((node) => (node.typeName === "CustomerCol" ? asArray(specOf(node).ids) : null));
    const count = Math.max(0, ...values.map((column) => column.length));
    const rows = Array.from({length: count}, (_, r) => {
        const row = {};
        columns.forEach((column, i) => {
            row[column.key] = values[i][r];
            if (ids[i]) row[column.idKey] = ids[i][r];
        });
        return row;
    });
    return <DataTable columns={columns} rows={rows}
                      emptyText={loading ? "در حال خواندنِ دفتر …" : props.emptyText}/>;
};

// نمودار تا رسیدنِ داده جای خالیِ هم‌اندازه می‌گیرد تا کارت با رسیدنش نپرد
const ChartSlot = ({children, empty}) => {
    const loading = useIsQueryLoading();
    if (empty) {
        return loading
            ? <div className="mx-3.5 mb-3 h-36 rounded-xl animate-pulse bg-var-color-01 dark:bg-var-color-36"/>
            : <p className="m-0 px-3.5 pb-3 text-[12px] text-var-color-04 dark:text-var-color-39">داده‌ای برای نمایش نیست</p>;
    }
    return (
        <div className="px-2 pb-2.5 min-w-0">
            <Suspense fallback={<div className="h-36"/>}>{children}</Suspense>
        </div>
    );
};

const seriesOf = (props) => asArray(props.series).map(specOf);

export const UiBarChart = ({props}) => (
    <ChartSlot empty={asArray(props.labels).length === 0}>
        <UiChart kind="bar" labels={asArray(props.labels)} series={seriesOf(props)} format={props.format}/>
    </ChartSlot>
);

export const UiLineChart = ({props}) => (
    <ChartSlot empty={asArray(props.labels).length === 0}>
        <UiChart kind="line" labels={asArray(props.labels)} series={seriesOf(props)} format={props.format}/>
    </ChartSlot>
);

export const UiDonutChart = ({props}) => (
    <ChartSlot empty={asArray(props.labels).length === 0}>
        <UiChart kind="donut" labels={asArray(props.labels)} values={asArray(props.values)} format={props.format}/>
    </ChartSlot>
);

// ⚠️ `useStateField` همان اتصالِ دوطرفه به `$period` است: انتخابِ کاربر متغیر را
// عوض می‌کند و هر Queryای که آن را در آرگومان دارد، بی‌صدا زدنِ مدل دوباره اجرا می‌شود
export const UiSelect = ({props}) => {
    const field = useStateField(props.name, props.value);
    const options = asArray(props.options).map(specOf).filter((option) => option.value !== undefined);
    return (
        <div className="px-3.5 pb-2.5">
            <select value={field.value ?? ""} onChange={(event) => field.setValue(event.target.value)}
                    aria-label="فیلتر"
                    className="px-2.5 py-1.5 rounded-lg text-[12px] cursor-pointer outline-none
                               text-var-color-06 dark:text-var-color-01 bg-var-color-01 dark:bg-var-color-36
                               border border-var-color-02 dark:border-var-color-38 focus-glow">
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </div>
    );
};

export const UiNote = ({props}) => (
    <p className={`m-0 px-3.5 pb-3 text-[12px] leading-6
                   ${props.tone === "warning" ? "text-var-color-53" : "text-var-color-04 dark:text-var-color-39"}`}>
        {toFaDigits(props.text ?? "")}
    </p>
);
