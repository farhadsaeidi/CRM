import {useEffect, useRef, useState} from "react";
import {FiAlertTriangle, FiArrowLeft, FiArrowUp, FiCpu, FiMic, FiPlus} from "react-icons/fi";
import {useNavigate} from "react-router";
import {OPEN_DEBT_REMINDER_EVENT} from "../../../lib/events.js";
import {ALL_TRANSACTIONS_PATH, CUSTOMERS_PATH, HOME_PATH, customerLedgerPath} from "../../../lib/paths.js";
import {HiOutlineChartBar, HiOutlineCash, HiOutlineSearch, HiOutlineDocumentReport} from "react-icons/hi";
import ScrollContainer from "../../../components/common/ScrollContainer.jsx";

// پیشنهادهای شروع — متناسب با دامنهٔ همین سامانه (دفترِ حساب مشتریان)
const SUGGESTIONS = [
    {icon: HiOutlineChartBar, tone: "text-var-color-15",
     title: "وضعیت مشتریان", body: "خلاصهٔ بدهکار، بستانکار و تسویه"},
    {icon: HiOutlineCash, tone: "text-var-color-53",
     title: "گردش مالی", body: "مجموع نسیه و پرداختی در دوره"},
    {icon: HiOutlineSearch, tone: "text-var-color-31",
     title: "جستجو در تراکنش‌ها", body: "یافتن تراکنش بر پایهٔ تاریخ"},
    {icon: HiOutlineDocumentReport, tone: "text-var-color-25",
     title: "گزارش دوره‌ای", body: "گزارش هفتگی یا ماهانه"},
];

// نامِ ابزارها به فارسی، برای خطِ «این عدد از کجا آمد» زیرِ پاسخ.
// بدونِ آن کاربر نمی‌داند جواب از دفترِ خودش آمده یا مدل جمله ساخته.
const TOOL_LABELS = {
    overview: "نمای کلی دفتر",
    customer_summary: "خلاصهٔ مشتریان",
    transaction_summary: "خلاصهٔ تراکنش‌ها",
    debtors: "فهرست بدهکاران",
    find_customer: "جستجوی مشتری",
    customer_ledger: "حساب مشتری",
};

/**
 * پاسخِ دستیار — چه ذخیره‌شده، چه در حالِ نوشته شدن.
 *
 * یک کامپوننت برای هر دو، تا وقتی استریم تمام می‌شود و پیامِ ذخیره‌شده جایش را
 * می‌گیرد، متن یک پیکسل هم جابه‌جا نشود.
 */
const AssistantMessage = ({message, streaming = false, onSuggestion}) => (
    <div className="flex gap-2.5">
        <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                         bg-var-color-12 dark:bg-var-color-44 border border-var-color-13 dark:border-var-color-16">
            <FiCpu className="w-4 h-4 text-var-color-15"/>
        </span>
        <div className="min-w-0">
            <p className="m-0 pt-0.5 text-[13.5px] leading-7 text-var-color-06 dark:text-var-color-01
                          whitespace-pre-wrap wrap-break-word">
                {message.body}
                {/* نشانگرِ «هنوز در حال نوشتن» — همان مکث‌نمای چت‌های زبانی */}
                {streaming && (
                    <span className="inline-block w-1.5 h-4 mr-0.5 align-text-bottom bg-var-color-15"
                          style={{animation: "crm-blink 1s ease-in-out infinite"}}/>
                )}
            </p>

            {/* منبعِ عدد — تا کاربر بداند جواب از دفترِ خودش خوانده شده، نه از
                حافظهٔ مدل. حینِ استریم نشان داده نمی‌شود چون هنوز قطعی نیست. */}
            {!streaming && message.tools_used?.length > 0 && (
                <p className="m-0 mt-1.5 text-[11px] text-var-color-04 dark:text-var-color-39">
                    بر پایهٔ {message.tools_used.map((t) => TOOL_LABELS[t] ?? t).join("، ")}
                </p>
            )}

            {/* پیشنهادِ قدمِ بعد. دکمه است نه متن، چون مقصد دارد. */}
            {!streaming && message.suggestion?.label && (
                <button type="button"
                        onClick={() => onSuggestion?.(message.suggestion)}
                        className="mt-2.5 inline-flex flex-row items-center gap-1.5 px-3 py-1.5 rounded-full
                                   cursor-pointer text-[12px] transition-colors duration-200
                                   text-var-color-15 bg-var-color-12 dark:bg-var-color-44
                                   border border-var-color-13 dark:border-var-color-16
                                   hover:bg-var-color-13 dark:hover:bg-var-color-13">
                    {message.suggestion.label}
                    <FiArrowLeft className="w-3.5 h-3.5"/>
                </button>
            )}
        </div>
    </div>
);


const ChatPane = ({conversation, messages = [], streamingText = null, runningTool = null,
                  engineError = null, onSend}) => {
    const navigate = useNavigate();
    const [draft, setDraft] = useState("");
    const [pending, setPending] = useState(false);
    const scrollRef = useRef(null);
    const taRef = useRef(null);

    // چسبیدن به انتهای گفتگو با هر پیام تازه
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, pending]);

    // ارتفاعِ خودکارِ کادر نوشتن، با سقف
    const autoGrow = (el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    };

    const send = async (text) => {
        const body = (text ?? draft).trim();
        if (!body || pending || !conversation) return;
        setDraft("");
        if (taRef.current) taRef.current.style.height = "auto";
        setPending(true);
        try {
            await onSend(body);
        } finally {
            setPending(false);
        }
    };

    const keyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    // مقصدِ هر پیشنهاد. مسیرها از `lib/paths.js` می‌آیند و مودالِ یادآوری با
    // همان رویدادی باز می‌شود که منوی فوتر استفاده می‌کند — نه یک راهِ دوم.
    const runSuggestion = (suggestion) => {
        if (!suggestion) return;
        switch (suggestion.action) {
            case "debt_reminder":
                window.dispatchEvent(new CustomEvent(OPEN_DEBT_REMINDER_EVENT));
                break;
            case "customer_ledger":
                navigate(customerLedgerPath(suggestion.customer_id));
                break;
            case "customers":
                navigate(CUSTOMERS_PATH);
                break;
            case "transactions":
                navigate(ALL_TRANSACTIONS_PATH);
                break;
            case "dashboard":
                navigate(HOME_PATH);
                break;
            default:
                break;
        }
    };

    const empty = messages.length === 0;

    // ریشه `flex-1` است و نه `h-full`: نوارِ مسیر هم بالای همین ستون نشسته، پس
    // ارتفاعِ ثابتِ ۱۰۰٪ به اندازهٔ آن سرریز می‌کرد
    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <ScrollContainer viewportRef={scrollRef} className="flex-1 min-h-0" overflowX="hidden">
                {empty ? (
                    // ── حالت خالی: تیتر و کارت‌های پیشنهاد، با ورودِ پلکانی ──
                    <div className="h-full flex flex-col items-center justify-center px-5 py-10">
                        <div className="relative mb-6" style={{animation: "crm-rise .5s ease-out both"}}>
                            {/* هالهٔ ملایم پشت نشان، برای عمق دادن به فضای خالی */}
                            <span aria-hidden="true"
                                  className="absolute inset-0 -z-10 blur-2xl rounded-full bg-var-color-13"/>
                            <span className="w-14 h-14 rounded-2xl flex items-center justify-center
                                             bg-var-color-12 dark:bg-var-color-44 border border-var-color-13 dark:border-var-color-16">
                                <FiCpu className="w-7 h-7 text-var-color-15"/>
                            </span>
                        </div>
                        <h2 className="m-0 text-[26px] 2xs:text-[30px] font-IRANSansXFaNumDemiBold tracking-tightest
                                       text-var-color-06 dark:text-var-color-01"
                            style={{animation: "crm-rise .5s ease-out .06s both"}}>
                            چه کاری برایتان انجام دهم؟
                        </h2>
                        <p className="mt-2 mb-8 text-[13px] text-var-color-04 dark:text-var-color-39"
                           style={{animation: "crm-rise .5s ease-out .12s both"}}>
                            دستیار سامانهٔ مدیریت مشتریان
                        </p>

                        <div className="w-full max-w-3xl grid grid-cols-1 2xs:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            {SUGGESTIONS.map((s, i) => (
                                <button key={s.title} type="button" onClick={() => send(s.title)}
                                        style={{animation: `crm-rise .5s ease-out ${0.18 + i * 0.05}s both`}}
                                        className="group text-right p-3.5 rounded-2xl cursor-pointer
                                                   bg-var-color-00 dark:bg-var-color-37
                                                   border border-var-color-02 dark:border-var-color-38
                                                   hover:border-var-color-14 dark:hover:border-var-color-16
                                                   hover:-translate-y-0.5 transition-all duration-200">
                                    <s.icon className={`w-5 h-5 mb-2.5 ${s.tone}`}/>
                                    <span className="block text-[13px] font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">
                                        {s.title}
                                    </span>
                                    <span className="block mt-1 text-[11.5px] leading-5 text-var-color-04 dark:text-var-color-39">
                                        {s.body}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    // ── گفتگو: پیام کاربر حباب‌دار، پاسخ دستیار تمام‌عرض (مثل چت مدل‌های زبانی) ──
                    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
                        {messages.map((m) => m.role === "user" ? (
                            <div key={m.id} className="self-start max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md
                                                    bg-var-color-12 dark:bg-var-color-44 text-[13.5px] leading-7
                                                    text-var-color-06 dark:text-var-color-01 whitespace-pre-wrap wrap-break-word">
                                {m.body}
                            </div>
                        ) : (
                            <AssistantMessage key={m.id} message={m} onSuggestion={runSuggestion}/>
                        ))}

                        {/* پاسخی که همین حالا نوشته می‌شود. همان قالبِ بالا را
                            دارد تا موقعِ تمام شدن، متن جابه‌جا نپرد. */}
                        {streamingText !== null && (
                            <AssistantMessage message={{body: streamingText}} streaming/>
                        )}
                        {/* پاسخی نیامده و دلیلش را سرور گفته. ظاهرش عمداً با
                            حبابِ دستیار فرق دارد تا با یک جوابِ واقعی اشتباه نشود. */}
                        {!pending && engineError && (
                            <div className="flex gap-2.5 rounded-xl px-3 py-2.5
                                            bg-var-color-54 border border-var-color-61/40">
                                <FiAlertTriangle className="shrink-0 w-4 h-4 mt-1 text-var-color-53"/>
                                <p className="m-0 text-[12.5px] leading-7 text-var-color-53">{engineError}</p>
                            </div>
                        )}
                        {pending && streamingText === null && (
                            <div className="flex gap-2.5 items-center">
                                <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                                                 bg-var-color-12 dark:bg-var-color-44 border border-var-color-13 dark:border-var-color-16">
                                    <FiCpu className="w-4 h-4 text-var-color-15"/>
                                </span>
                                {/* ⚠️ فقط سه نقطه کافی نیست: مدلِ محلی روی CPU
                                    چند دقیقه طول می‌کشد و کاربر بی‌متن فکر می‌کند
                                    برنامه هنگ کرده. */}
                                <span className="flex flex-row items-center gap-2"
                                      aria-label="در حال آماده‌سازی پاسخ">
                                    <span className="flex gap-1">
                                        {[0, 1, 2].map((d) => (
                                            <span key={d} className="w-1.5 h-1.5 rounded-full bg-var-color-04 dark:bg-var-color-39"
                                                  style={{animation: `crm-blink 1s ease-in-out ${d * 0.15}s infinite`}}/>
                                        ))}
                                    </span>
                                    <span className="text-[11.5px] text-var-color-04 dark:text-var-color-39">
                                        {runningTool
                                            ? `در حال خواندنِ ${TOOL_LABELS[runningTool] ?? runningTool} …`
                                            : "در حال آماده‌سازی پاسخ …"}
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </ScrollContainer>

            {/* ── کامپوزر ── */}
            <div className="shrink-0 px-4 pb-4 pt-2">
                <div className="max-w-3xl mx-auto rounded-3xl p-2
                                bg-var-color-00 dark:bg-var-color-37
                                border border-var-color-02 dark:border-var-color-38
                                focus-within:border-var-color-14 dark:focus-within:border-var-color-16
                                shadow-[0_2px_10px_rgba(15,23,42,0.05)] dark:shadow-none transition-colors duration-200">
                    <textarea ref={taRef} rows={1} value={draft} onKeyDown={keyDown}
                              onChange={(e) => {
                                  setDraft(e.target.value);
                                  autoGrow(e.target);
                              }}
                              placeholder="پیام خود را بنویسید ..."
                              className="w-full max-h-50 px-3 pt-2 pb-1 text-[13.5px] leading-7 resize-none bg-transparent
                                         text-var-color-06 dark:text-var-color-01 focus:outline-none input-placeholder"/>
                    <div className="flex items-center gap-1 px-1 pt-1">
                        <button type="button" aria-label="افزودن"
                                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer
                                           text-var-color-05 dark:text-var-color-39
                                           hover:bg-var-color-01 dark:hover:bg-var-color-40 transition-colors">
                            <FiPlus className="w-4.5 h-4.5"/>
                        </button>
                        {/* mr-auto فضای خالی را سمت راست جمع می‌کند و این گروه را به لبهٔ چپ می‌برد
                            (در RTL معادلِ «انتهای خط») */}
                        <span className="mr-auto flex items-center gap-1">
                            <button type="button" aria-label="گفتار"
                                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer
                                               text-var-color-05 dark:text-var-color-39
                                               hover:bg-var-color-01 dark:hover:bg-var-color-40 transition-colors">
                                <FiMic className="w-4 h-4"/>
                            </button>
                            {/* enabled: لازم است چون :hover روی دکمهٔ disabled هم اعمال می‌شود */}
                            <button type="button" aria-label="ارسال" disabled={!draft.trim() || pending}
                                    onClick={() => send()}
                                    className="w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-200
                                               bg-var-color-15 text-var-color-11
                                               enabled:hover:brightness-110 enabled:active:scale-90
                                               disabled:opacity-35 disabled:cursor-default cursor-pointer">
                                <FiArrowUp className="w-4.5 h-4.5"/>
                            </button>
                        </span>
                    </div>
                </div>
                <p className="m-0 mt-2 text-center text-[10.5px] text-var-color-04 dark:text-var-color-39">
                    این دستیار هنوز به داده‌های سامانه متصل نیست.
                </p>
            </div>
        </div>
    );
};

export default ChatPane;
