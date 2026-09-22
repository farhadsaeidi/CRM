import {useMemo, useState} from "react";
import {Renderer} from "@openuidev/react-lang";
import {FiAlertTriangle} from "react-icons/fi";
import {chatApi} from "../../../api/chat.js";
import {library, parser} from "./library.js";

// ⚠️ **حافظهٔ کوتاه، نه یک لایهٔ کش.** همان Query با همان آرگومان در ده ثانیه
// یک درخواست است: رابط هنگامِ استریم بارها بازپارس می‌شود، و مدلی که برخلافِ
// قاعده بازهٔ تازه‌سازی بگذارد، هر ثانیه سرور را صدا نمی‌زند. بیشتر از ده ثانیه
// نه — بعد از ثبتِ یک تراکنش، گفتگوی بعدی باید عددِ تازه را ببیند.
const FRESH_MS = 10_000;
const recent = new Map();

const runQuery = (name, args) => {
    const key = `${name}:${JSON.stringify(args ?? {})}`;
    const hit = recent.get(key);
    if (hit && Date.now() - hit.at < FRESH_MS) return hit.promise;
    const promise = chatApi.query(name, args ?? {});
    recent.set(key, {at: Date.now(), promise});
    promise.catch(() => recent.delete(key));
    return promise;
};

// هر `Query("debtors", …)` از همین راه به `POST /api/chat/query/` می‌رود. شکلِ
// MCP دارد تا فهرستِ ابزارها در فرانت تکرار نشود: هر نامی به سرور می‌رود و
// فهرستِ سفید آنجاست.
const TOOL_PROVIDER = {
    callTool: async ({name, arguments: args}) => ({content: [], structuredContent: await runQuery(name, args)}),
};

// کدهای خطایی که یعنی «داده نیامد» — نه خطای ساختِ رابط
const QUERY_ERRORS = new Set(["tool-error", "mcp-error", "tool-not-found"]);

const QueryLoader = () => (
    <span aria-label="در حال خواندنِ دفتر"
          className="absolute top-3 left-3 z-10 w-4 h-4 rounded-full animate-spin
                     border-2 border-var-color-02 dark:border-var-color-38 border-t-var-color-15"/>
);

const Warning = ({children}) => (
    <p className="m-0 mt-1.5 flex flex-row items-start gap-1.5 text-[11px] text-var-color-53">
        <FiAlertTriangle className="shrink-0 w-3.5 h-3.5 mt-0.5"/>
        {children}
    </p>
);

/**
 * رابطی که دستیار نوشته (OpenUI Lang)، با دادهٔ زندهٔ دفتر.
 *
 * ⚠️ **داده هنگامِ نمایش خوانده می‌شود، نه هنگامِ جواب.** برخلافِ ویجت‌های فاز
 * صفر که عکسِ لحظه‌ای‌اند، این رابط با هر باز شدنِ گفتگو Queryهایش را دوباره
 * اجرا می‌کند و عددِ امروز را نشان می‌دهد. متنِ کنارش هم به همین دلیل عدد ندارد.
 *
 * اگر بعد از پایانِ استریم کد هیچ ریشه‌ای نساخت، به‌جای کادرِ خالی یک خطِ
 * توضیح می‌نشیند و متنِ جواب سرِ جایش می‌ماند.
 *
 * `children` زیرِ رابط می‌نشیند و **فقط اگر رابط ساخته شد** — جای دکمهٔ سنجاق:
 * سنجاق کردنِ برنامه‌ای که ساخته نمی‌شود یعنی یک کارتِ شکسته روی داشبورد.
 */
const GeneratedUi = ({code, streaming = false, children}) => {
    const [dataFailed, setDataFailed] = useState(false);
    const built = useMemo(() => streaming || Boolean(parser.parse(code).root), [code, streaming]);

    if (!built) return <Warning>این جواب قرار بود کارت یا جدولی نشان بدهد ولی ساخته نشد؛ لطفاً دوباره بپرسید.</Warning>;

    return (
        <div className="mt-2">
            <Renderer response={code} library={library} isStreaming={streaming}
                      toolProvider={TOOL_PROVIDER} queryLoader={<QueryLoader/>}
                      onError={(errors) => setDataFailed(errors.some((error) => QUERY_ERRORS.has(error.code)))}/>
            {dataFailed && <Warning>بخشی از داده از دفتر خوانده نشد؛ خانه‌های خالی یعنی همین.</Warning>}
            {children}
        </div>
    );
};

export default GeneratedUi;
