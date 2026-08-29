import {useEffect, useRef, useState} from "react";
import {FiAlertTriangle, FiArrowUp, FiMic, FiPlus, FiSquare} from "react-icons/fi";
import AgentIcon from "../../../components/common/AgentIcon.jsx";
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
// ⚠️ عددی که بدونِ ابزار آمده، ساختهٔ مدل است.
//
// مدل‌های کوچک وقتی جوابِ شبیهی در تاریخچه می‌بینند وسوسه می‌شوند تکرارش کنند
// به‌جای اینکه دوباره دفتر را بخوانند — و در یک دفترِ حساب، عددِ ساختگی بدترین
// خروجیِ ممکن است. پرامپت این را کم می‌کند ولی از بین نمی‌برد.
//
// شرط عمداً «عدد دارد» است نه «ابزار ندارد»: «سلام، چطور کمکتان کنم؟» هم ابزاری
// ندارد ولی خطری هم ندارد، و هشدار روی آن فقط نویز است.
const DIGITS = /[0-9۰-۹٠-٩]/;

const isUngrounded = (message) =>
    (message.tools_used?.length ?? 0) === 0 && DIGITS.test(message.body || "");


const AssistantMessage = ({message, streaming = false}) => (
    <div className="flex gap-2.5">
        <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                         bg-var-color-12 dark:bg-var-color-44 border border-var-color-13 dark:border-var-color-16">
            <AgentIcon className="w-4 h-4 text-var-color-15"/>
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

            {!streaming && isUngrounded(message) && (
                <p className="m-0 mt-1.5 flex flex-row items-start gap-1.5 text-[11px] text-var-color-53">
                    <FiAlertTriangle className="shrink-0 w-3.5 h-3.5 mt-0.5"/>
                    این پاسخ از دفترِ شما خوانده نشده؛ عددهایش قابلِ اتکا نیست.
                </p>
            )}
        </div>
    </div>
);


const ChatPane = ({conversation, messages = [], streamingText = null, runningTool = null,
                  engineError = null, onSend, onStop}) => {
    const [draft, setDraft] = useState("");
    const [pending, setPending] = useState(false);
    const scrollRef = useRef(null);
    const taRef = useRef(null);

    // ⚠️ **با هر تکهٔ استریم هم اسکرول می‌کند، نه فقط با پیامِ تازه.**
    //
    // جوابِ دستیار حرف‌به‌حرف بلند می‌شود؛ با وابستگیِ `messages.length` فقط یک
    // بار در آغاز اسکرول می‌شد و بعد خطوطِ تازه زیرِ کادرِ نوشتن پنهان می‌شدند.
    //
    // ولی **فقط وقتی کاربر خودش ته است**: اگر بالا رفته و دارد چیزی می‌خواند،
    // پریدن به پایین آزاردهنده است. آستانهٔ ۸۰ پیکسل کمی لقی می‌دهد تا اسکرولِ
    // نرمِ مرورگر آن را «بالا رفته» حساب نکند.
    const stick = () => {
        const el = scrollRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (atBottom) el.scrollTop = el.scrollHeight;
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length]);

    useEffect(stick, [streamingText, runningTool, pending]);

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

    // ⚠️ پیشنهاد یک **سوال** است، نه لینک: با کلیک به‌جای کاربر فرستاده می‌شود
    // و دستیار جوابش را می‌دهد. کاربر در گفتگو نشسته و می‌خواهد بیشتر بپرسد،
    // نه اینکه از گفتگو بیرون پرت شود.
    const runSuggestion = (question) => {
        if (!question || pending) return;
        send(question);
    };

    // پیشنهادهای آخرین پاسخِ دستیار. فیلد در دیتابیس JSON است و روزگاری یک
    // شیء بود، پس هر دو شکل پذیرفته می‌شود تا گفتگوهای قدیمی نشکنند.
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    // پیشنهادها حالا رشته‌اند. گفتگوهای ذخیره‌شدهٔ قبلی شیءِ `{label, action}`
    // دارند؛ برچسبشان برداشته می‌شود تا نشکنند، هرچند دیگر جایی نمی‌برند.
    const raw = lastAssistant?.suggestion;
    const suggestions = (Array.isArray(raw) ? raw : [])
        .map((item) => (typeof item === "string" ? item : item?.label))
        .filter(Boolean);

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
                                <AgentIcon className="w-7 h-7 text-var-color-15"/>
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
                            // ⚠️ در RTL «انتهای خط» چپ است، پس `self-end` حبابِ
                            // کاربر را سمتِ چپ می‌برد و پاسخِ دستیار سمتِ راست
                            // می‌ماند — همان چیدمانی که کاربر انتظار دارد.
                            <div key={m.id} className="self-end max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md
                                                    bg-var-color-12 dark:bg-var-color-44 text-[13.5px] leading-7
                                                    text-var-color-06 dark:text-var-color-01 whitespace-pre-wrap wrap-break-word">
                                {m.body}
                            </div>
                        ) : (
                            <AssistantMessage key={m.id} message={m}/>
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
                                    <AgentIcon className="w-4 h-4 text-var-color-15"/>
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
                {/* کادرِ نوشتن — گرد و جادار، با هالهٔ آبیِ کم‌رنگ روی فوکوس.
                    رنگ‌ها از همان پالتِ پروژه‌اند نه یک بنفشِ وارداتی، وگرنه
                    این کادر تنها چیزِ ناهماهنگِ صفحه می‌شد. */}
                <div className="max-w-3xl mx-auto rounded-[26px] p-2.5
                                bg-var-color-00 dark:bg-var-color-37
                                border border-var-color-02 dark:border-var-color-38
                                focus-within:border-var-color-64
                                shadow-[0_2px_10px_rgba(15,23,42,0.05)] dark:shadow-none
                                transition-colors duration-200">
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
                            {/* ⚠️ حینِ پاسخ، همین دکمه «توقف» می‌شود.
                                جای دکمهٔ دوم را نمی‌گیرد چون در هر لحظه فقط یکی
                                از این دو کار ممکن است، و روی CPU پاسخ چند دقیقه
                                طول می‌کشد — بدونِ راهِ توقف، کاربر گروگانِ آن است.
                                enabled: لازم است چون :hover روی دکمهٔ disabled هم می‌نشیند. */}
                            {pending ? (
                                <button type="button" aria-label="توقف پاسخ" onClick={onStop}
                                        className="w-8.5 h-8.5 rounded-full flex items-center justify-center
                                                   transition-all duration-200 cursor-pointer
                                                   bg-var-color-56 text-var-color-55
                                                   border border-var-color-55
                                                   hover:brightness-110 active:scale-90">
                                    <FiSquare className="w-3.5 h-3.5" fill="currentColor"/>
                                </button>
                            ) : (
                                <button type="button" aria-label="ارسال" disabled={!draft.trim()}
                                        onClick={() => send()}
                                        className="w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-200
                                                   bg-var-color-15 text-var-color-11
                                                   enabled:hover:brightness-110 enabled:active:scale-90
                                                   disabled:opacity-35 disabled:cursor-default cursor-pointer">
                                    <FiArrowUp className="w-4.5 h-4.5"/>
                                </button>
                            )}
                        </span>
                    </div>
                </div>
                {/* ⚠️ پیشنهادها **زیرِ کادرِ نوشتن**اند نه چسبیده به پاسخ: قدمِ
                    بعدی‌اند، پس جایشان کنارِ همان‌جایی است که کاربر قدمِ بعدی را
                    برمی‌دارد. چسبیده به پیام، هر پاسخِ قدیمی هم دکمه‌های خودش
                    را نگه می‌داشت و صفحه پر از دکمهٔ منقضی می‌شد.
                    فقط پیشنهادهای **آخرین** پاسخ نشان داده می‌شوند. */}
                {suggestions.length > 0 && !pending && (
                    <div className="max-w-3xl mx-auto mt-3 flex flex-row flex-wrap justify-center gap-2">
                        {suggestions.map((question) => (
                            <button key={question} type="button"
                                    onClick={() => runSuggestion(question)}
                                    // ⚠️ هاور فقط پس‌زمینه را کمی روشن می‌کند. بوردر
                                    // عمداً ثابت می‌ماند: این‌ها پیشنهادند نه دکمهٔ
                                    // اقدام، و برجسته شدنشان توجه را از خودِ گفتگو
                                    // می‌دزدد.
                                    className="inline-flex flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full
                                               cursor-pointer text-[12px] transition-colors duration-200
                                               text-var-color-06 dark:text-var-color-39
                                               bg-var-color-01 dark:bg-var-color-40
                                               border border-var-color-02 dark:border-var-color-38
                                               hover:bg-var-color-02 dark:hover:bg-var-color-44">
                                {question}
                            </button>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};

export default ChatPane;
