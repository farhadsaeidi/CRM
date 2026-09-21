import {defineComponent, reactive} from "@openuidev/react-lang";
import {z} from "zod/v4";

/**
 * کامپوننت‌هایی که مدل اجازه دارد در جوابِ گفتگو بسازد — فقط تعریف، بدونِ JSX.
 *
 * ⚠️ **این فایل عمداً JSX ندارد.** دو مصرف‌کننده دارد: `library.jsx` که همین‌ها را
 * با رندرکننده‌های واقعی می‌سازد، و `scripts/openui-prompt.mjs` که با نودِ خام
 * پرامپتِ مدل را از روی همین تعریف‌ها تولید می‌کند. تعریفِ دوم یعنی روزی پرامپت
 * چیزی را وعده می‌دهد که صفحه نمی‌شناسد.
 *
 * ⚠️ **ترتیبِ کلیدهای هر `z.object` همان ترتیبِ آرگومان‌هاست.** مدل آرگومان‌ها را
 * جایگاهی می‌نویسد (`Col("بدهی", q.rows.amount, "money")`)، پس جابه‌جا کردنِ دو
 * کلید یعنی خراب شدنِ هر برنامه‌ای که قبلاً ساخته و ذخیره شده. اختیاری‌ها آخرند.
 *
 * مجموعه عمداً کوچک است: راهنمای خودِ OpenUI و بنچمارکش هر دو می‌گویند
 * کامپوننتِ کمتر و متمایزتر یعنی خطای کمترِ مدل.
 */

// قالبِ نمایشِ یک عدد. قالب‌بندی کارِ صفحه است نه مدل: مدل عددِ خام را از Query
// می‌گیرد و فقط می‌گوید «این مبلغ است»، تا هرگز خودش رقمی را بازنویسی نکند.
const FORMAT = z.enum(["money", "count", "percent", "days", "date", "status", "text"])
    .describe("money = Tomans, count, percent (0-100), days (days ago), date (1405/02/20), status (بدهکار/بستانکار coloured), text");

// رنگِ معنادار، همان زبانِ جدول‌های برنامه: بدهی صورتی، پرداخت سبز
const TONE = z.enum(["debt", "credit", "neutral"])
    .describe("debt = owed by customers (pink), credit = paid (green)");

const noop = () => null;

export const ROOT = "Stack";

/**
 * `renderers` نگاشتِ نامِ کامپوننت به رندرکنندهٔ React است؛ بدونِ آن (در
 * اسکریپتِ پرامپت) هر کامپوننت هیچ چیزی رندر نمی‌کند و فقط امضایش مهم است.
 */
export const buildComponents = (renderers = {}) => {
    const define = (name, description, props) =>
        defineComponent({name, description, props, component: renderers[name] ?? noop});

    const Kpi = define("Kpi",
        "One headline metric. value MUST be a Query field or a @builtin over Query results, never a literal.",
        z.object({
            label: z.string(),
            value: z.union([z.number(), z.string()]).nullable(),
            format: FORMAT.optional(),
            tone: TONE.optional(),
        }));

    const KpiGrid = define("KpiGrid", "A grid of Kpi tiles, two or three per row.",
        z.object({items: z.array(Kpi.ref)}));

    const CustomerCol = define("CustomerCol",
        "Customer-name column; each name links to that customer's ledger. names = q.rows.name, ids = q.rows.customer_id.",
        z.object({
            label: z.string(),
            names: z.array(z.string()),
            ids: z.array(z.number()),
        }));

    const Col = define("Col", "One table column: an array plucked from a Query result, e.g. q.rows.amount.",
        z.object({
            label: z.string(),
            values: z.array(z.any()),
            format: FORMAT.optional(),
            tone: TONE.optional(),
        }));

    const Table = define("Table",
        "Rows are built by zipping the columns' arrays. emptyText is shown when there are no rows.",
        z.object({
            columns: z.array(z.union([CustomerCol.ref, Col.ref])),
            emptyText: z.string().optional(),
        }));

    const Series = define("Series", "One data series of a chart.",
        z.object({
            name: z.string(),
            values: z.array(z.number()),
            tone: z.enum(["debt", "credit", "accent"]).optional(),
        }));

    const BarChart = define("BarChart", "Compare values across categories: customers, aging buckets or months.",
        z.object({
            labels: z.array(z.string()),
            series: z.array(Series.ref),
            format: FORMAT.optional(),
        }));

    const LineChart = define("LineChart", "A trend over time, e.g. the months of monthly_trend.",
        z.object({
            labels: z.array(z.string()),
            series: z.array(Series.ref),
            format: FORMAT.optional(),
        }));

    const DonutChart = define("DonutChart", "Parts of a whole, e.g. customer_mix.",
        z.object({
            labels: z.array(z.string()),
            values: z.array(z.number()),
            format: FORMAT.optional(),
        }));

    const Option = define("Option", "One choice of a Select.",
        z.object({value: z.string(), label: z.string()}));

    // ⚠️ `value` باید reactive باشد تا `$period` دوطرفه به آن وصل شود؛ بدونِ آن
    // انتخابِ کاربر هیچ Queryای را دوباره اجرا نمی‌کرد
    const Select = define("Select",
        "A dropdown bound to a $variable. Put the same $variable in a Query's args to make it a live filter.",
        z.object({
            name: z.string(),
            value: reactive(z.string()),
            options: z.array(Option.ref),
        }));

    const Note = define("Note", "A short Persian remark. Never put a literal number in it.",
        z.object({
            text: z.string(),
            tone: z.enum(["info", "warning"]).optional(),
        }));

    const block = z.union([KpiGrid.ref, Table.ref, BarChart.ref, LineChart.ref, DonutChart.ref,
                           Select.ref, Note.ref]);

    const Card = define("Card", "A titled panel that groups related blocks. title is Persian.",
        z.object({
            title: z.string(),
            children: z.array(block),
            subtitle: z.string().optional(),
        }));

    const Stack = define("Stack", "The root. Stacks cards and blocks vertically at full width.",
        z.object({children: z.array(z.union([Card.ref, block]))}));

    return [Stack, Card, KpiGrid, Kpi, Table, CustomerCol, Col, BarChart, LineChart, DonutChart,
            Series, Select, Option, Note];
};

export const COMPONENT_GROUPS = [
    {
        name: "Layout",
        components: ["Stack", "Card"],
        notes: ["- Group related blocks in a Card with a short Persian title."],
    },
    {
        name: "Numbers and tables",
        components: ["KpiGrid", "Kpi", "Table", "CustomerCol", "Col"],
        notes: [
            "- Every value comes from a Query result or a @builtin over one. Never type a number, name or date yourself.",
            "- Use CustomerCol for customer names so each row links to the customer's ledger.",
            '- Amounts are Tomans: use format "money". Never format numbers with string concatenation.',
        ],
    },
    {
        name: "Charts",
        components: ["BarChart", "LineChart", "DonutChart", "Series"],
        notes: ["- LineChart for trends over months, BarChart to compare items, DonutChart for parts of a whole."],
    },
    {
        name: "Filters and text",
        components: ["Select", "Option", "Note"],
    },
];
