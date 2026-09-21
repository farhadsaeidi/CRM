import {Link} from "react-router";
import ScrollContainer from "../../../../components/common/ScrollContainer.jsx";
import {toFaDigits} from "../../../../lib/chart.js";
import {customerLedgerPath} from "../../../../lib/paths.js";
import {BADGE_CLASS, BAR_CLASS, TONE_TEXT, formatValue, statusTone, unitOf} from "./widgetFormat.js";

// ستون‌های متنی راست‌چین‌اند و بقیه وسط‌چین — همان قاعدهٔ جدول‌های برنامه
const TEXT_KINDS = new Set(["customer", "text"]);

const MUTED = "text-var-color-04 dark:text-var-color-39";

// نوارِ نسبیِ زیرِ عدد، تا بزرگ‌ترین بدهی در یک نگاه پیدا باشد — بدونِ کشیدنِ
// کتابخانهٔ نمودار (recharts فقط در چانکِ داشبورد است) به صفحهٔ گفتگو
const Bar = ({tone, ratio}) => {
    const palette = BAR_CLASS[tone];
    if (!palette) return null;
    return (
        <span aria-hidden="true" className={`block h-1 mt-1 rounded-full ${palette.track}`}>
            <span className={`block h-full rounded-full ${palette.fill}`}
                  style={{width: `${Math.max(4, Math.min(100, ratio * 100))}%`}}/>
        </span>
    );
};

const Cell = ({column, row, max}) => {
    const value = row[column.key];
    switch (column.kind) {
        case "customer": {
            // شناسه کنارِ نام در همان ردیف است؛ کلیدش را ستون می‌گوید، چون در
            // رابطِ مدل هر ستون آرایهٔ خودش را دارد
            const id = row[column.idKey ?? "customer_id"];
            return id ? (
                <Link to={customerLedgerPath(id)}
                      className="text-var-color-06 dark:text-var-color-01 hover:text-var-color-19
                                 dark:hover:text-var-color-15 hover:underline underline-offset-4">
                    {value}
                </Link>
            ) : value;
        }
        case "phone":
            return <span dir="ltr">{toFaDigits(value ?? "—")}</span>;
        case "status":
            return (
                <span className={`px-2 py-0.5 rounded-md text-[11px] ${BADGE_CLASS[statusTone(value)]}`}>
                    {value}
                </span>
            );
        case "days":
            return value === null || value === undefined
                ? <span className={MUTED}>{column.empty ?? "—"}</span>
                : formatValue(value, "days");
        case "count":
            return formatValue(value, "count");
        case "money":
        case "percent": {
            // ⚠️ مبلغِ صفر خط تیره می‌شود نه «۰»: هر تراکنش یا نسیه است یا پرداختی،
            // و ستونِ دیگرش در آن ردیف معنایی ندارد. درصدِ صفر اما واقعیت است.
            if (column.kind === "money" && !value) return <span className={MUTED}>—</span>;
            const ratio = column.kind === "percent" ? Number(value) / 100 : (max ? Number(value) / max : 0);
            return (
                <span className={`inline-block min-w-16 ${TONE_TEXT[column.tone] ?? ""}`}>
                    {formatValue(value, column.kind)}
                    {column.bar && <Bar tone={column.bar} ratio={ratio}/>}
                </span>
            );
        }
        default:
            return toFaDigits(value ?? "—");
    }
};

/**
 * بدنهٔ جدولِ کوچک — مشترکِ ویجتِ ثابت (`TableWidget`) و `Table`ِ رابطی که مدل
 * می‌سازد. قاب و عنوان کارِ والد است.
 *
 * سرستون و بوردرها همان توکن‌های جدول‌های اصلیِ برنامه‌اند (۵۹/۵۲ و ۵۷/۳۸)، تا
 * جدولِ داخلِ گفتگو با جدولِ صفحهٔ مشتریان یک خانواده دیده شود.
 */
const DataTable = ({columns = [], rows = [], total = null, emptyText = "داده‌ای برای نمایش نیست"}) => {
    // بیشینهٔ هر ستونِ نوار‌دار، برای طولِ نسبیِ نوارها
    const max = Object.fromEntries(columns.filter((c) => c.bar).map((c) => [
        c.key, Math.max(0, ...rows.map((r) => Number(r[c.key]) || 0)),
    ]));

    return (
        <>
            {/* ⚠️ فقط اسکرولِ افقی: روی گوشی چهار ستون جا نمی‌شود. کلاسِ چیدمان
                روی ScrollContainer نمی‌نشیند (کتابخانه viewport را بینشان
                می‌گذارد)، پس جدول خودش پهنا می‌گیرد. */}
            <ScrollContainer overflowY="hidden" className="border-t border-var-color-57 dark:border-var-color-38">
                <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                        <tr className="bg-var-color-59 dark:bg-var-color-52 text-var-color-60 dark:text-var-color-51">
                            {columns.map((column) => (
                                <th key={column.key} scope="col"
                                    className={`px-3 py-2 text-[11.5px] font-IRANSansXFaNumMedium whitespace-nowrap
                                                ${TEXT_KINDS.has(column.kind) ? "text-right" : "text-center"}`}>
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.customer_id ? `${row.customer_id}-${index}` : index}
                                className="border-t border-var-color-57 dark:border-var-color-38">
                                {columns.map((column) => (
                                    <td key={column.key}
                                        className={`px-3 py-2 text-var-color-06 dark:text-var-color-01
                                                    ${TEXT_KINDS.has(column.kind) ? "text-right" : "text-center whitespace-nowrap"}`}>
                                        <Cell column={column} row={row} max={max[column.key]}/>
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {rows.length === 0 && columns.length > 0 && (
                            <tr className="border-t border-var-color-57 dark:border-var-color-38">
                                <td colSpan={columns.length} className={`px-3 py-4 text-center text-[12px] ${MUTED}`}>
                                    {emptyText}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </ScrollContainer>
            {total && (
                <footer className="flex flex-row items-center justify-between gap-2 px-3.5 py-2.5
                                   border-t border-var-color-57 dark:border-var-color-38 text-[12px]">
                    <span className={MUTED}>{total.label}</span>
                    <span className="font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">
                        {formatValue(total.value, total.format)}
                        <span className={`mr-1 text-[10.5px] font-IRANSansXFaNumRegular ${MUTED}`}>
                            {unitOf(total.format)}
                        </span>
                    </span>
                </footer>
            )}
        </>
    );
};

export default DataTable;
