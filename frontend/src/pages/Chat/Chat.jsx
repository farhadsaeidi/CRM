import {useCallback, useEffect, useRef, useState} from "react";
import AgentIcon from "../../components/common/AgentIcon.jsx";
import Breadcrumb from "../../components/common/Breadcrumb.jsx";
import Sidebar from "../../components/common/Sidebar.jsx";
import ChatSidebar from "./components/ChatSidebar.jsx";
import ChatPane from "./components/ChatPane.jsx";
import {chatApi} from "../../api/chat.js";
import {streamMessage} from "../../api/chatStream.js";
import {errorMessage} from "../../lib/apiError.js";
import {notify} from "../../lib/notify.jsx";
import {CHAT_PATH} from "../../lib/paths.js";
import {useGoBack} from "../../lib/useGoBack.js";

// کلیدِ یادآوریِ «نمایش هوشمند» روی همین دستگاه
const VISUAL_KEY = "crm:chat-visual";

/**
 * صفحهٔ گفتگو. سایدبارش فهرستِ گفتگوهاست، نه ناوبریِ برنامه — ناوبری فقط در
 * صفحهٔ خانه است و دکمهٔ بازگشتِ همین سایدبار به صفحهٔ قبل برمی‌گردد.
 *
 * گفتگوها سمتِ سرور می‌مانند (`chat.Conversation`)، پس رفرش و بازکردن از
 * دستگاهِ دیگر تاریخچه را نگه می‌دارد.
 *
 * ⚠️ **پیام‌ها فقط برای گفتگوی باز خوانده می‌شوند، نه همه با هم.** فهرستِ کناری
 * عمداً بدونِ پیام می‌آید؛ وگرنه با ده گفتگو کلِ تاریخچه در هر بار باز شدنِ صفحه
 * منتقل می‌شد در حالی که کاربر یکی را باز می‌کند.
 */
const Chat = () => {
    const goBack = useGoBack();
    const [conversations, setConversations] = useState([]);
    const [activeId, setActiveId] = useState(null);
    // پیام‌های گفتگوی باز، جدا از فهرست — به همان دلیلِ بالا
    const [messages, setMessages] = useState([]);
    // شناسهٔ گفتگویی که پیام‌هایش واقعاً از سرور رسیده.
    //
    // ⚠️ **«هنوز نرسیده» و «خالی است» دو حالتِ جدا هستند.** با عوض شدنِ گفتگو
    // پیام‌ها خالی می‌شوند تا جوابِ سرور برسد، و `ChatPane` تا امروز فقط
    // `messages.length` را می‌دید — پس گفتگوی پُر چند ثانیه صفحهٔ «گفتگوی تازه»
    // را نشان می‌داد و بعد محتوایش می‌آمد. از پشتِ تونلِ کُند کاملاً به چشم می‌آمد.
    const [loadedId, setLoadedId] = useState(null);
    const [loading, setLoading] = useState(true);
    // خطای موتور — پاسخ نیامده ولی پیامِ کاربر سرِ جایش است
    const [engineError, setEngineError] = useState(null);
    // کنترلرِ درخواستِ در جریان — برای دکمهٔ توقف
    const abortRef = useRef(null);
    // پاسخی که همین حالا در حالِ نوشته شدن است. جدا از `messages` نگه داشته
    // می‌شود تا با هر حرفِ تازه کلِ فهرست دوباره رندر نشود.
    const [streamingText, setStreamingText] = useState(null);
    // ابزاری که همین حالا اجرا می‌شود — بینِ سوال و اولین حرفِ جواب، روی CPU
    // چند دقیقه سکوت است و کاربر باید بداند چه خبر است
    const [runningTool, setRunningTool] = useState(null);
    // کارت‌ها و جدول‌های پاسخِ در حالِ نوشتن. پیش از متن می‌رسند و با `done`
    // جایشان را نسخهٔ ذخیره‌شده در خودِ پیام می‌گیرد.
    const [streamingWidgets, setStreamingWidgets] = useState([]);

    const active = conversations.find((c) => c.id === activeId) ?? null;

    // فهرستِ مدل‌ها و پیش‌فرضِ سرور — یک بار برای کلِ صفحه
    const [models, setModels] = useState([]);
    const [defaultModel, setDefaultModel] = useState("");
    useEffect(() => {
        let ignore = false;
        chatApi.models()
            .then((res) => {
                if (ignore) return;
                setModels(res?.models ?? []);
                setDefaultModel(res?.default ?? "");
            })
            // ⚠️ بی‌صدا: کشو ناپدید می‌شود ولی چت با مدلِ پیش‌فرضِ سرور کار
            // می‌کند. یک پیغامِ قرمز برای قابلیتی که جایگزینِ سالم دارد،
            // کاربر را از کاری که آمده انجام دهد می‌ترساند.
            .catch(() => {});
        return () => {
            ignore = true;
        };
    }, []);

    // «نمایش هوشمند» — خاموش یعنی جوابِ متنی، روشن یعنی کارت و جدول و نمودار (سه
    // حالتش کنارِ `answer_stream` در سرور است). ترجیحِ شخصیِ همین دستگاه است نه
    // دادهٔ گفتگو، پس در localStorage می‌ماند؛ در حالتِ خصوصیِ مرورگر که
    // دسترسی به آن خطا می‌دهد، بی‌صدا به «خاموش» برمی‌گردد.
    const [visual, setVisual] = useState(() => {
        try {
            return localStorage.getItem(VISUAL_KEY) === "1";
        } catch {
            return false;
        }
    });
    const changeVisual = useCallback((next) => {
        setVisual(next);
        try {
            localStorage.setItem(VISUAL_KEY, next ? "1" : "0");
        } catch {
            // فقط یادآوری از دست می‌رود؛ خودِ انتخاب برای همین نشست کار می‌کند
        }
    }, []);

    // سنجاق‌های داشبورد — اینجا فقط برای اینکه دکمهٔ زیرِ هر جواب بداند سنجاق شده یا نه.
    // بی‌صدا مثلِ فهرستِ مدل‌ها: بدونش دکمه‌ها «سنجاق‌نشده» می‌مانند و بقیهٔ چت سالم است.
    const [pins, setPins] = useState([]);
    useEffect(() => {
        let ignore = false;
        chatApi.pins()
            .then((rows) => {
                if (!ignore) setPins(rows ?? []);
            })
            .catch(() => {});
        return () => {
            ignore = true;
        };
    }, []);

    const pinAnswer = useCallback(async (messageId) => {
        try {
            const pin = await chatApi.pin(messageId);
            setPins((prev) => [pin, ...prev.filter((p) => p.id !== pin.id)]);
            notify("به داشبورد سنجاق شد.", "success");
        } catch (err) {
            notify(errorMessage(err, "سنجاق کردن ناموفق بود."), "error");
        }
    }, []);

    // خوش‌بینانه: دکمه همان لحظه برمی‌گردد. در شکست فهرست از سرور خوانده می‌شود،
    // نه اینکه حدس بزنیم چه چیزی را برگردانیم.
    const unpinAnswer = useCallback(async (pinId) => {
        setPins((prev) => prev.filter((p) => p.id !== pinId));
        try {
            await chatApi.unpin(pinId);
        } catch (err) {
            notify(errorMessage(err, "برداشتنِ سنجاق ناموفق بود."), "error");
            chatApi.pins().then((rows) => setPins(rows ?? [])).catch(() => {});
        }
    }, []);

    // مدلِ گفتگوی باز. سرور مرجع است؛ تا پاسخِ گفتگو نیامده پیش‌فرض نشان
    // داده می‌شود.
    const [pendingModel, setPendingModel] = useState(null);
    const model = pendingModel ?? active?.model ?? defaultModel;

    const changeModel = useCallback((next) => {
        setPendingModel(next);
        setConversations((prev) => prev.map((c) =>
            (c.id === activeId ? {...c, model: next} : c)));
    }, [activeId]);

    // فهرستِ اولیه. اگر مالک هیچ گفتگویی ندارد یکی ساخته می‌شود تا صفحه با
    // حالتِ خالیِ بی‌مقصد باز نشود.
    useEffect(() => {
        let ignore = false;
        chatApi.list()
            .then(async (res) => {
                const rows = res?.results ?? res ?? [];
                if (ignore) return;
                if (rows.length === 0) {
                    const fresh = await chatApi.create();
                    if (ignore) return;
                    setConversations([fresh]);
                    setActiveId(fresh.id);
                } else {
                    setConversations(rows);
                    setActiveId(rows[0].id);
                }
            })
            .catch((err) => {
                if (!ignore) notify(errorMessage(err, "دریافت گفتگوها ناموفق بود."), "error");
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, []);

    // پاک‌سازیِ پیام‌ها هنگامِ تعویضِ گفتگو با مقایسه در حین رندر انجام می‌شود،
    // نه با افکت: قاعدهٔ `react-hooks/set-state-in-effect` هر setStateِ همگام در
    // بدنهٔ افکت را رد می‌کند. ضمناً این‌طور پیام‌های گفتگوی قبلی یک لحظه هم
    // زیرِ عنوانِ گفتگوی تازه دیده نمی‌شوند.
    const [lastActiveId, setLastActiveId] = useState(activeId);
    if (lastActiveId !== activeId) {
        setLastActiveId(activeId);
        setMessages([]);
        setEngineError(null);
        setStreamingText(null);
        setRunningTool(null);
        setStreamingWidgets([]);
        // ⚠️ لازم است، وگرنه مدلی که برای گفتگوی قبلی انتخاب شده بود روی
        // گفتگوی تازه می‌نشیند و کاربر فکر می‌کند این گفتگو هم همان را دارد.
        setPendingModel(null);
    }

    // پیام‌های گفتگوی باز
    useEffect(() => {
        if (activeId === null) return undefined;
        let ignore = false;
        chatApi.detail(activeId)
            .then((res) => {
                if (ignore) return;
                setMessages(res.messages ?? []);
                setLoadedId(activeId);
            })
            .catch((err) => {
                if (ignore) return;
                // در شکست هم علامت می‌خورد، وگرنه اسکلتِ بارگذاری تا ابد می‌ماند
                setLoadedId(activeId);
                notify(errorMessage(err, "خواندن این گفتگو ناموفق بود."), "error");
            });
        return () => {
            ignore = true;
        };
    }, [activeId]);

    // ⚠️ **خطاها دیگر با یک متنِ ثابت پوشانده نمی‌شوند.** نسخهٔ قبلیِ این
    // هندلرها `catch {}` بی‌پارامتر داشت، پس ۵۰۳ِ رلهٔ تونل، ۴۰۳ِ CSRF و ۵۰۰ِ
    // سرور هر سه همان «ناموفق بود» را نشان می‌دادند و علت نه برای کاربر
    // پیدا بود نه برای عیب‌یابی. `errorMessage` پیامِ خودِ سرور یا وضعیتِ HTTP
    // را برمی‌گرداند و متنِ قبلی فقط وقتی می‌آید که هیچ‌کدام نباشد.
    const createConversation = async () => {
        try {
            const fresh = await chatApi.create();
            // وضعیتِ موفق با بدنهٔ خالی/ناقص هم ممکن است (پاسخِ نیمه‌کاره از
            // پشتِ رله). بدونِ این بررسی `fresh.id` یک TypeError می‌داد که از
            // خطای سرور قابلِ تشخیص نبود.
            if (!fresh?.id) {
                throw Object.assign(new Error("empty response"),
                    {data: {message: "پاسخِ سرور ناقص رسید؛ دوباره تلاش کنید."}});
            }
            setConversations((prev) => [fresh, ...prev]);
            setActiveId(fresh.id);
            setMessages([]);
            // گفتگوی تازه قطعاً خالی است؛ منتظرِ سرور ماندن فقط یک اسکلتِ بی‌دلیل
            // پیش از صفحهٔ خوش‌آمد نشان می‌داد
            setLoadedId(fresh.id);
        } catch (err) {
            console.error("create conversation failed", err?.status, err?.data ?? err);
            notify(errorMessage(err, "ساختِ گفتگوی تازه ناموفق بود."), "error");
        }
    };

    // «بازگشت به اینجا» — این پیام و بعدی‌ها حذف می‌شوند و متنش برمی‌گردد تا
    // کاربر همان سوال را ویرایش کند. متن برگردانده می‌شود نه ست؛ کادرِ نوشتن
    // مالِ ChatPane است.
    const rewindTo = useCallback(async (messageId) => {
        if (activeId === null) return undefined;
        try {
            const res = await chatApi.rewind(activeId, messageId);
            setMessages(res?.conversation?.messages ?? []);
            setEngineError(null);
            return res?.body;
        } catch (err) {
            notify(errorMessage(err, "بازگشت به این نقطه ناموفق بود."), "error");
            return undefined;
        }
    }, [activeId]);

    // «انشعاب از اینجا» — گفتگوی اصلی دست نمی‌خورد و شاخهٔ تازه باز می‌شود.
    // تعویضِ `activeId` خودش پیام‌های شاخه را می‌آورد.
    const forkFrom = useCallback(async (messageId) => {
        if (activeId === null) return;
        try {
            const fresh = await chatApi.fork(activeId, messageId);
            setConversations((prev) => [fresh, ...prev]);
            setActiveId(fresh.id);
            notify("گفتگوی تازه از همین نقطه ساخته شد.");
        } catch (err) {
            notify(errorMessage(err, "انشعاب از این نقطه ناموفق بود."), "error");
        }
    }, [activeId]);

    const renameConversation = async (id, title) => {
        // ⚠️ خوش‌بینانه: نامِ تازه بلافاصله می‌نشیند و در صورتِ شکست برمی‌گردد.
        // انتظار برای رفت‌وبرگشتِ شبکه روی یک ویرایشِ درجا، تایپ را کند نشان
        // می‌دهد و کاربر فکر می‌کند کلیدش نگرفته.
        const previous = conversations.find((c) => c.id === id)?.title;
        setConversations((prev) => prev.map((c) => (c.id === id ? {...c, title} : c)));
        try {
            await chatApi.rename(id, title);
        } catch (err) {
            setConversations((prev) => prev.map((c) =>
                (c.id === id ? {...c, title: previous} : c)));
            notify(errorMessage(err, "تغییر نام گفتگو ناموفق بود."), "error");
        }
    };

    const deleteConversation = async (id) => {
        try {
            await chatApi.remove(id);
        } catch (err) {
            notify(errorMessage(err, "حذف گفتگو ناموفق بود."), "error");
            return;
        }
        const rest = conversations.filter((c) => c.id !== id);
        setConversations(rest);
        if (id === activeId) setActiveId(rest[0]?.id ?? null);
    };

    // ارسالِ پیام. پیامِ کاربر بلافاصله روی صفحه می‌نشیند و بعد سرور تاییدش
    // می‌کند — انتظار برای رفت‌وبرگشتِ شبکه قبل از دیدنِ حرفِ خود کاربر، چت را
    // کند نشان می‌دهد.
    const sendMessage = useCallback(async (body) => {
        if (activeId === null) return;
        const optimistic = {id: `tmp-${Date.now()}`, role: "user", body, created: null};
        setMessages((prev) => [...prev, optimistic]);
        setEngineError(null);
        setStreamingText(null);
        setRunningTool(null);
        setStreamingWidgets([]);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            await streamMessage(activeId, body, {
                onStart: (payload) => {
                    setMessages((prev) => prev.map((m) =>
                        (m.id === optimistic.id ? payload.userMessage : m)));
                    setConversations((prev) => prev.map((c) =>
                        (c.id === activeId ? {...c, title: payload.title} : c)));
                },
                onTool: (name) => setRunningTool(name),
                // ⚠️ `runningTool` اینجا پاک نمی‌شود: ویجت یعنی همان ابزار تمام شد، ولی
                // شاید ابزارِ بعدی در راه باشد؛ پاک کردنش را `onDelta` یا ابزارِ
                // بعدی انجام می‌دهد
                onWidget: (widget) => setStreamingWidgets((prev) => [...prev, widget]),
                onDelta: (text) => {
                    setRunningTool(null);
                    setStreamingText((prev) => (prev ?? "") + text);
                },
                // متنِ خامِ یک فراخوانیِ ابزار روی صفحه رفته بود — دور ریخته شود.
                // ویجت‌ها می‌مانند: دادهٔ واقعیِ ابزارند نه متنِ مدل.
                onReset: () => setStreamingText(null),
                onDone: (message) => {
                    setStreamingText(null);
                    setRunningTool(null);
                    setStreamingWidgets([]);
                    if (message) setMessages((prev) => [...prev, message]);
                },
                // خطای موتور یعنی پیامی ذخیره نشد؛ ویجت‌ها هم با همان پاسخ می‌روند
                onError: (text) => {
                    setStreamingText(null);
                    setRunningTool(null);
                    setStreamingWidgets([]);
                    setEngineError(text);
                },
            }, controller.signal, model, visual);
        } catch (err) {
            setStreamingText(null);
            setRunningTool(null);
            setStreamingWidgets([]);

            // ⚠️ توقف خطا نیست. کاربر خودش گفته بس است، پس نه پیغامِ قرمزی
            // لازم است نه پاک کردنِ پیامش — سوالش پرسیده شده و سرِ جایش می‌ماند.
            if (err?.name === "AbortError") return;

            // شکستِ خودِ درخواست — برخلافِ خطای موتور، پیامِ کاربر ذخیره نشده
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            notify(errorMessage(err, "ارسال پیام ناموفق بود."), "error");
        } finally {
            abortRef.current = null;
        }
    }, [activeId, model, visual]);

    // ⚠️ با قطعِ اتصال، ژنراتورِ سرور هم بسته می‌شود و پاسخِ نیمه‌کاره **ذخیره
    // نمی‌شود** — چون ذخیره در همان ژنراتور اتفاق می‌افتد نه در تردِ تولید.
    // یعنی توقف واقعاً یعنی توقف، نه پنهان کردنِ چیزی که پشتِ صحنه تمام می‌شود.
    const stopStreaming = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
    }, []);

    return (
        <section className="h-full min-h-0 flex flex-col md:flex-row gap-3 2xs:gap-4">
            <Sidebar className="max-h-52 md:max-h-none">
                <ChatSidebar conversations={conversations} activeId={activeId}
                             loading={loading}
                             onBack={goBack} onNew={createConversation}
                             onSelect={setActiveId} onDelete={deleteConversation}
                             onRename={renameConversation}/>
            </Sidebar>

            <div className="flex-1 min-w-0 flex flex-col rounded-[18px] overflow-hidden
                            bg-var-color-00 dark:bg-var-color-36
                            border border-var-color-02 dark:border-var-color-38">
                {/* نوارِ مسیر داخلِ ستونِ اصلی و بیرونِ ناحیهٔ اسکرول است، پس با
                    بلند شدنِ گفتگو بالا سرِ جایش می‌ماند. اینجاست و نه داخلِ
                    ChatPane، چون آن با هر تعویضِ گفتگو `key` عوض می‌کند و
                    remount می‌شود — نوار هم هر بار دوباره انیمیشنِ ورود می‌گرفت. */}
                <div className="shrink-0 px-3 pt-3">
                    <Breadcrumb items={[{label: "دستیار هوش مصنوعی", to: CHAT_PATH, icon: AgentIcon}]}/>
                </div>
                <ChatPane key={activeId} conversation={active} messages={messages}
                          historyLoading={activeId !== null && loadedId !== activeId}
                          streamingText={streamingText} runningTool={runningTool}
                          streamingWidgets={streamingWidgets}
                          engineError={engineError} onSend={sendMessage}
                          onStop={stopStreaming}
                          models={models} model={model} onModelChange={changeModel}
                          onRewind={rewindTo} onFork={forkFrom}
                          pins={pins} onPin={pinAnswer} onUnpin={unpinAnswer}
                          visual={visual} onVisualChange={changeVisual}/>
            </div>
        </section>
    );
};

export default Chat;
