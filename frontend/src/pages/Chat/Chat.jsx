import {useCallback, useEffect, useState} from "react";
import {FiMessageSquare} from "react-icons/fi";
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
    const [loading, setLoading] = useState(true);
    // خطای موتور — پاسخ نیامده ولی پیامِ کاربر سرِ جایش است
    const [engineError, setEngineError] = useState(null);
    // پاسخی که همین حالا در حالِ نوشته شدن است. جدا از `messages` نگه داشته
    // می‌شود تا با هر حرفِ تازه کلِ فهرست دوباره رندر نشود.
    const [streamingText, setStreamingText] = useState(null);
    // ابزاری که همین حالا اجرا می‌شود — بینِ سوال و اولین حرفِ جواب، روی CPU
    // چند دقیقه سکوت است و کاربر باید بداند چه خبر است
    const [runningTool, setRunningTool] = useState(null);

    const active = conversations.find((c) => c.id === activeId) ?? null;

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
            .catch(() => {
                if (!ignore) notify("دریافت گفتگوها ناموفق بود.", "error");
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
    }

    // پیام‌های گفتگوی باز
    useEffect(() => {
        if (activeId === null) return undefined;
        let ignore = false;
        chatApi.detail(activeId)
            .then((res) => {
                if (!ignore) setMessages(res.messages ?? []);
            })
            .catch(() => {
                if (!ignore) notify("خواندن این گفتگو ناموفق بود.", "error");
            });
        return () => {
            ignore = true;
        };
    }, [activeId]);

    const createConversation = async () => {
        try {
            const fresh = await chatApi.create();
            setConversations((prev) => [fresh, ...prev]);
            setActiveId(fresh.id);
            setMessages([]);
        } catch {
            notify("ساختِ گفتگوی تازه ناموفق بود.", "error");
        }
    };

    const deleteConversation = async (id) => {
        try {
            await chatApi.remove(id);
        } catch {
            notify("حذف گفتگو ناموفق بود.", "error");
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

        try {
            await streamMessage(activeId, body, {
                onStart: (payload) => {
                    setMessages((prev) => prev.map((m) =>
                        (m.id === optimistic.id ? payload.userMessage : m)));
                    setConversations((prev) => prev.map((c) =>
                        (c.id === activeId ? {...c, title: payload.title} : c)));
                },
                onTool: (name) => setRunningTool(name),
                onDelta: (text) => {
                    setRunningTool(null);
                    setStreamingText((prev) => (prev ?? "") + text);
                },
                // متنِ خامِ یک فراخوانیِ ابزار روی صفحه رفته بود — دور ریخته شود
                onReset: () => setStreamingText(null),
                onDone: (message) => {
                    setStreamingText(null);
                    setRunningTool(null);
                    if (message) setMessages((prev) => [...prev, message]);
                },
                onError: (text) => {
                    setStreamingText(null);
                    setRunningTool(null);
                    setEngineError(text);
                },
            });
        } catch (err) {
            // شکستِ خودِ درخواست — برخلافِ خطای موتور، پیامِ کاربر ذخیره نشده
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setStreamingText(null);
            setRunningTool(null);
            notify(errorMessage(err, "ارسال پیام ناموفق بود."), "error");
        }
    }, [activeId]);

    return (
        <section className="h-full min-h-0 flex flex-col md:flex-row gap-3 2xs:gap-4">
            <Sidebar className="max-h-52 md:max-h-none">
                <ChatSidebar conversations={conversations} activeId={activeId}
                             loading={loading}
                             onBack={goBack} onNew={createConversation}
                             onSelect={setActiveId} onDelete={deleteConversation}/>
            </Sidebar>

            <div className="flex-1 min-w-0 flex flex-col rounded-[18px] overflow-hidden
                            bg-var-color-00 dark:bg-var-color-36
                            border border-var-color-02 dark:border-var-color-38">
                {/* نوارِ مسیر داخلِ ستونِ اصلی و بیرونِ ناحیهٔ اسکرول است، پس با
                    بلند شدنِ گفتگو بالا سرِ جایش می‌ماند. اینجاست و نه داخلِ
                    ChatPane، چون آن با هر تعویضِ گفتگو `key` عوض می‌کند و
                    remount می‌شود — نوار هم هر بار دوباره انیمیشنِ ورود می‌گرفت. */}
                <div className="shrink-0 px-3 pt-3">
                    <Breadcrumb items={[{label: "گفتگو", to: CHAT_PATH, icon: FiMessageSquare}]}/>
                </div>
                <ChatPane key={activeId} conversation={active} messages={messages}
                          streamingText={streamingText} runningTool={runningTool}
                          engineError={engineError} onSend={sendMessage}/>
            </div>
        </section>
    );
};

export default Chat;
