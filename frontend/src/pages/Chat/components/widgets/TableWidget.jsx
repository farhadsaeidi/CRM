import {Link} from "react-router";
import ScrollContainer from "../../../../components/common/ScrollContainer.jsx";
import {toFaDigits} from "../../../../lib/chart.js";
import {customerLedgerPath} from "../../../../lib/paths.js";
import {BADGE_CLASS, BAR_CLASS, TONE_TEXT, formatValue, statusTone, unitOf} from "./widgetFormat.js";
import WidgetFrame from "./WidgetFrame.jsx";

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
        case "customer":
            return row.customer_id ? (
                <Link to={customerLedgerPath(row.customer_id)}
                      className="text-var-color-06 dark:text-var-color-01 hover:text-var-color-19
                                 dark:hover:text-var-color-15 hover:underline underline-offset-4">
                    {value}
                </Link>
            ) : value;
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
 * جدولِ کوچک — بدهکاران، آخرین تراکنش‌ها، خوش‌حساب‌ها، …
 *
 * سرستون و بوردرها همان توکن‌های جدول‌های اصلیِ برنامه‌اند (۵۹/۵۲ و ۵۷/۳۸)، تا
 * جدولِ داخلِ گفتگو با جدولِ صفحهٔ مشتریان یک خانواده دیده شود.
 */
const TableWidget = ({widget}) => {
    const columns = widget.columns ?? [];
    const rows = widget.rows ?? [];
    // بیشینهٔ هر ستونِ نوار‌دار، برای طولِ نسبیِ نوارها
    const max = Object.fromEntries(columns.filter((c) => c.bar).map((c) => [
        c.key, Math.max(0, ...rows.map((r) => Number(r[c.key]) || 0)),
    ]));

    return (
        <WidgetFrame title={widget.title} subtitle={widget.subtitle} link={widget.link}>
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
                    </tbody>
                </table>
            </ScrollContainer>
            {widget.total && (
                <footer className="flex flex-row items-center justify-between gap-2 px-3.5 py-2.5
                                   border-t border-var-color-57 dark:border-var-color-38 text-[12px]">
                    <span className={MUTED}>{widget.total.label}</span>
                    <span className="font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">
                        {formatValue(widget.total.value, widget.total.format)}
                        <span className={`mr-1 text-[10.5px] font-IRANSansXFaNumRegular ${MUTED}`}>
                            {unitOf(widget.total.format)}
                        </span>
                    </span>
                </footer>
            )}
        </WidgetFrame>
    );
};

export default TableWidget;
