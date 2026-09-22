// پرامپتِ «رابطِ مولد» را از روی تعریفِ کامپوننت‌ها می‌سازد و کنارِ بک‌اند می‌نویسد.
// اجرا:  npm run openui:prompt   →   chat/openui/prompt.txt
//
// ⚠️ **خروجی کامیت می‌شود.** بک‌اند پایتون است و نمی‌تواند این کتابخانه را صدا
// بزند، پس پرامپت یک‌بار اینجا ساخته و خوانده می‌شود. هر تغییری در `defs.js`
// یعنی این اسکریپت دوباره اجرا شود؛ وگرنه مدل کامپوننتی را صدا می‌زند که دیگر
// وجود ندارد یا از کامپوننتِ تازه خبر ندارد.
//
// بخشِ ابزارها اینجا نیست: تعریفِ ابزارها در `chat/ui_tools.py` است و خودِ
// بک‌اند آن بخش را به انتهای همین متن می‌چسباند — یک منبع برای هر چیز.
import {mkdirSync, writeFileSync} from "node:fs";
import {dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createLibrary} from "@openuidev/react-lang";
import {buildComponents, COMPONENT_GROUPS, ROOT} from "../src/pages/Chat/openui/defs.js";

const OUT = fileURLToPath(new URL("../../chat/openui/prompt.txt", import.meta.url));

const PREAMBLE = `## Generative UI (openui-lang)

The user switched on «نمایش هوشمند» (smart display), so you answer with a live UI. You write it in
openui-lang, the small language described below, and the user's browser renders it with the app's
own components.

- For a question about the ledger's data (debts, customers, transactions, trends), answer with a
  comprehensive UI — a small dashboard built for this one question.
- For conversation or questions about using the app, answer in plain Persian text with no code.

The most important rule: you never carry the data. Every number, name and date the user sees comes
from Query() when the UI renders. You only write the wiring.`;

const RULES = [
    "Be comprehensive, not minimal: combine headline numbers (KpiGrid), a chart that shows the shape of the data and a Table with the details. Add the closely related view the owner would want next — for debtors the debt aging, for one customer their transactions, for a trend the period totals. Add a period Select when the numbers depend on the period. At most three Cards.",
    "All visible text (titles, labels, options, notes, emptyText) is Persian.",
    'Query defaults are exactly the empty shapes listed under "Default values for Query results". Never copy real rows, names or numbers into them.',
    "Never use mock, example or invented data. If no listed tool provides what the user asks for, say so in Persian text and output no code.",
    "There are no write tools: never use Mutation, Action, @Run, @Set, @Reset, @ToAssistant or @OpenUrl.",
    "Never pass Query's 4th argument (refresh interval).",
    "Customer-specific tools take a customer_id. Get it by calling the find_customer function tool first and never guess one. If several customers match, ask the user which one they mean.",
    "Call find_customer ONLY when the user names one specific customer. For anything about the whole ledger (debtors, trends, mix, aging, recent transactions) make no function call at all: write the UI directly.",
    "Text outside the code block is at most two short Persian sentences that introduce the UI. Never repeat numbers in the text; the UI shows them.",
    "Output at most one ```openui-lang block per answer, after the introductory text.",
    'Dates from tools are strings like 1405/02/20: show them with format "date" and never convert them.',
    'Formats: "money" for Toman amounts, "percent" for collection_rate and ratio, "days" for day counts, "count" for how many, "status" for a status field.',
    "A conditional value is the ternary `cond ? a : b`; there is no if/else keyword.",
];

const EXAMPLES = [
    `User: بدهکارانم را نشان بده

بدهکاران، سهمِ هر کدام از طلبِ شما، و کهنگیِ بدهی‌ها:

\`\`\`openui-lang
root = Stack([card, agingCard])
debt = Query("debtors", {limit: 10}, {rows: []})
aging = Query("debt_aging", {}, {rows: []})
card = Card("بدهکاران", [kpis, chart, tbl])
kpis = KpiGrid([Kpi("تعداد بدهکاران", debt.count, "count"), Kpi("مجموع طلب", debt.total, "money", "debt")])
chart = BarChart(debt.rows.name, [Series("بدهی", debt.rows.amount, "debt")], "money")
tbl = Table([CustomerCol("مشتری", debt.rows.name, debt.rows.customer_id), Col("بدهی", debt.rows.amount, "money", "debt"), Col("آخرین تراکنش", debt.rows.days, "days")], "هیچ مشتری‌ای بدهکار نیست")
agingCard = Card("سررسید بدهی‌ها", [BarChart(aging.rows.label, [Series("بدهی", aging.rows.amount, "debt")], "money")], "بر پایهٔ روزهای گذشته از آخرین تراکنش")
\`\`\``,
    `User: وضع کلی دفترم چطور است؟

نمای کلیِ دفتر؛ دوره را از بالای کارت عوض کنید:

\`\`\`openui-lang
root = Stack([card, trendCard])
$period = "month"
ov = Query("overview", {period: $period}, {})
trend = Query("monthly_trend", {}, {rows: []})
card = Card("نمای کلی دفتر", [filter, kpis], ov.period_label)
filter = Select("period", $period, [Option("month", "این ماه"), Option("year", "امسال"), Option("all", "کل دوره")])
kpis = KpiGrid([Kpi("طلب کل", ov.receivable, "money", "debt"), Kpi("نسیهٔ دوره", ov.period_debt, "money", "debt"), Kpi("وصولی دوره", ov.period_paid, "money", "credit"), Kpi("نرخ وصول", ov.collection_rate, "percent")])
trendCard = Card("روند دوازده ماه گذشته", [LineChart(trend.rows.label, [Series("نسیه", trend.rows.debt, "debt"), Series("وصولی", trend.rows.paid, "credit")], "money")])
\`\`\``,
    `User: ترکیب مشتریان و سررسید بدهی‌ها را نشان بده
(No function call: no customer was named, so the UI fetches everything itself.)

ترکیبِ مشتریان و کهنگیِ بدهی‌ها:

\`\`\`openui-lang
root = Stack([mixCard, agingCard])
mix = Query("customer_mix", {}, {rows: []})
aging = Query("debt_aging", {}, {rows: []})
mixCard = Card("ترکیب مشتریان", [DonutChart(mix.rows.label, mix.rows.count, "count")])
agingCard = Card("سررسید بدهی", [BarChart(aging.rows.label, [Series("بدهی", aging.rows.amount, "debt")], "money")])
\`\`\``,
    `User: حساب رضا را نشان بده
(You first called the find_customer function tool; it returned exactly one match, customer_id 42.)

حساب و تراکنش‌های رضا:

\`\`\`openui-lang
root = Stack([card])
led = Query("customer_ledger", {customer_id: 42}, {})
tx = Query("customer_transactions", {customer_id: 42, limit: 10}, {rows: []})
card = Card(led.name, [kpis, tbl], led.phone)
kpis = KpiGrid([Kpi("مانده حساب", led.balance_amount, "money"), Kpi("وضعیت", led.status, "status"), Kpi("تعداد تراکنش", led.count, "count"), Kpi("آخرین تراکنش", led.days_since_last, "days")])
tbl = Table([Col("تاریخ", tx.rows.date, "date"), Col("نسیه", tx.rows.debt, "money", "debt"), Col("پرداختی", tx.rows.paid, "money", "credit")], "هنوز تراکنشی ثبت نشده")
\`\`\``,
];

const FILTERS = `## Interactive Filters

To let the user filter data with a dropdown:
1. Declare a $variable with a default: \`$period = "month"\`
2. Bind it to a Select: \`Select("period", $period, [Option("month", "این ماه"), Option("year", "امسال")])\`
3. Pass the same $variable in the Query args: \`ov = Query("overview", {period: $period}, {})\`
4. When the user picks another option, the Query re-fetches by itself.

FILTER WIRING RULE: If a $binding filter is visible in the UI, EVERY relevant Query MUST reference that $binding in its args.
- $variables hold simple strings, NOT arrays or objects.
- Queries use regular identifiers: \`ov = Query(...)\`, not \`$ov = Query(...)\`.
`;

// ⚠️ **پرامپتِ پیش‌فرضِ کتابخانه برای دفترِ حساب جاهایی خطرناک و جاهایی غلط است.**
//
// - خطرناک: می‌گوید دادهٔ واقعی را به‌عنوان مقدارِ پیش‌فرضِ Query کپی کن — یعنی
//   مدل عدد را تایپ کند، همان چیزی که کلِ این طراحی برای حذفش است.
// - غلط: فرم و دکمه و `Mutation` و امضای دیگری از `Select` را معرفی می‌کند، که در
//   کتابخانهٔ ما نیستند. مدل از روی همین مثال‌ها کامپوننتِ ناموجود می‌سازد.
//
// هر وصله باید متنِ اصلی را پیدا کند. اگر نسخهٔ تازهٔ کتابخانه متن را عوض کرده
// باشد اسکریپت می‌ایستد، نه اینکه بی‌صدا همان جمله در پرامپت بماند.
const REPLACEMENTS = [
    [
        "1. FIRST: Call the most relevant tool to inspect the real data shape before generating code",
        "1. The output shape of every tool is listed below, so you never need a call to learn it. The only function tool is find_customer, for a customer_id",
    ],
    [
        "3. Use Mutation() for WRITE operations (create, update, delete) — triggered by button clicks via Action([@Run(mutationRef)])",
        "3. There are no write tools. Never use Mutation or Action",
    ],
    [
        "4. Use the real data from step 1 as condensed Query defaults (3-5 rows) so the UI renders immediately",
        '4. Query defaults are always the empty shapes listed under "Default values for Query results" — never real rows, names or numbers',
    ],
    [
        "RIGHT — use Query() for live data, Mutation() for writes, @builtins to derive values:",
        "RIGHT — use Query() for live data and @builtins to derive values:",
    ],
    [
        'createResult = Mutation("create_tool", {title: $title})\nsubmitBtn = Button("Create", Action([@Run(createResult), @Run(data), @Reset($title)]))\n',
        "",
    ],
    [
        'metrics = Query("tool_name", {arg1: value, arg2: $binding}, {defaultField: 0, defaultData: []}, refreshInterval?)',
        'metrics = Query("tool_name", {arg1: value, arg2: $binding}, {rows: []})',
    ],
    ["- Fourth arg (optional): refresh interval in seconds (e.g. 30 for auto-refresh every 30s)\n", ""],
    ['- Manual refresh: `Button("Refresh", Action([@Run(query1), @Run(query2)]), "secondary")` — re-fetches the listed queries\n', ""],
    ["- Refresh all queries: create Action with @Run for each query\n", ""],
    [
        'CORRECT: `Col("Actions", @Each(rows, "t", Button("Edit", Action([@Set($id, t.id)]))))`\nWRONG: `myBtn = Button("Edit", Action([@Set($id, t.id)]))` then `Col("Actions", @Each(rows, "t", myBtn))` — t is undefined in myBtn.',
        "",
    ],
    ["forms for input, etc.)", "KPI tiles for headline numbers)"],
    [
        'root = RootComp([header, content])\nheader = SomeHeader("Title")\ncontent = SomeContent("Hello world")',
        'root = Stack([card])\ndebt = Query("debtors", {limit: 10}, {rows: []})\ncard = Card("بدهکاران", [tbl])\ntbl = Table([CustomerCol("مشتری", debt.rows.name, debt.rows.customer_id), Col("بدهی", debt.rows.amount, "money", "debt")])',
    ],
    ["I created a simple layout with a header.", "The table lists every debtor, largest debt first."],
    [
        "- When the user asks for changes, output ONLY the changed/new statements in a fenced block",
        "- When the user asks for changes, output the COMPLETE updated program in a new fenced block",
    ],
];

// بخش‌هایی که کلاً کنار می‌روند (با `null`) یا از نو نوشته می‌شوند
const SECTIONS = [
    ["## Mutation — Write Operations", null],
    ["## Forms", null],
    ["## Interactive Filters", FILTERS],
];

const replaceOnce = (text, from, to) => {
    if (!text.includes(from)) throw new Error(`The OpenUI prompt changed; not found:\n${from}`);
    return text.replace(from, to);
};

// از سرتیترِ بخش تا سرتیترِ هم‌سطحِ بعدی
const replaceSection = (text, header, body) => {
    const start = text.indexOf(`\n${header}\n`);
    if (start === -1) throw new Error(`The OpenUI prompt changed; section not found: ${header}`);
    const end = text.indexOf("\n## ", start + header.length + 1);
    return `${text.slice(0, start + 1)}${body ?? ""}${end === -1 ? "" : text.slice(end + 1)}`;
};

const library = createLibrary({root: ROOT, components: buildComponents(), componentGroups: COMPONENT_GROUPS});

let prompt = library.prompt({
    preamble: PREAMBLE,
    toolCalls: true,
    bindings: true,
    inlineMode: true,
    examples: EXAMPLES,
    additionalRules: RULES,
});

for (const [header, body] of SECTIONS) prompt = replaceSection(prompt, header, body);
for (const [from, to] of REPLACEMENTS) prompt = replaceOnce(prompt, from, to);

// هیچ نامی از کامپوننت‌های کتابخانهٔ پیش‌فرض نباید باقی بماند — همان‌ها بودند
// که مدل را به ساختنِ کامپوننتِ ناموجود می‌کشاندند
for (const stray of ["Button(", "FormControl(", "SelectItem(", "Mutation(", "Form(", "RootComp(", "SomeHeader("]) {
    if (prompt.includes(stray)) throw new Error(`The prompt still mentions ${stray}`);
}

mkdirSync(dirname(OUT), {recursive: true});
writeFileSync(OUT, `${prompt.trim()}\n`);
console.log(`wrote ${OUT} (${prompt.length} chars)`);
