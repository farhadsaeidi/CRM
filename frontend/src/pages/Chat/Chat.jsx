import {useState} from "react";
import {useNavigate} from "react-router";
import Sidebar from "../../components/common/Sidebar.jsx";
import ChatSidebar from "./components/ChatSidebar.jsx";
import ChatPane from "./components/ChatPane.jsx";

// عنوانِ گفتگو از اولین پیامِ کاربر ساخته می‌شود (مثل چت مدل‌های زبانی)
const titleFrom = (body) => {
    const t = body.trim().replace(/\s+/g, " ");
    return t.length > 34 ? `${t.slice(0, 34)}…` : t;
};

const newConversation = () => ({id: `c-${Date.now()}`, title: "گفتگوی جدید", messages: []});

/**
 * صفحهٔ گفتگو. سایدبارش فهرستِ گفتگوهاست، نه ناوبریِ برنامه — ناوبری فقط در
 * صفحهٔ خانه است و دکمهٔ بازگشتِ همین سایدبار به آنجا برمی‌گردد.
 *
 * گفتگوها فعلاً فقط در حافظهٔ همین صفحه‌اند. نقطهٔ اتصال به سرور همین‌جاست:
 * state را با دادهٔ سرور جایگزین کنید و pushMessage را به فراخوانیِ واقعی وصل کنید.
 */
const Chat = () => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState(() => [newConversation()]);
    const [activeId, setActiveId] = useState(() => null);

    const active = conversations.find((c) => c.id === activeId) || conversations[0] || null;

    const createConversation = () => {
        const c = newConversation();
        setConversations((prev) => [c, ...prev]);
        setActiveId(c.id);
    };

    const deleteConversation = (id) => {
        setConversations((prev) => {
            const rest = prev.filter((c) => c.id !== id);
            if (id === activeId) setActiveId(rest[0]?.id || null);
            return rest;
        });
    };

    // افزودن پیام به گفتگوی فعال؛ اولین پیامِ کاربر عنوان را هم می‌سازد
    const pushMessage = (msg) => {
        setConversations((prev) => prev.map((c) => {
            if (c.id !== active?.id) return c;
            const isFirstUserMsg = msg.role === "user" && c.messages.length === 0;
            return {
                ...c,
                title: isFirstUserMsg ? titleFrom(msg.body) : c.title,
                messages: [...c.messages, msg],
            };
        }));
    };

    return (
        <section className="h-full min-h-0 flex flex-col md:flex-row gap-3 2xs:gap-4">
            <Sidebar className="max-h-52 md:max-h-none">
                <ChatSidebar conversations={conversations} activeId={active?.id ?? null}
                             onBack={() => navigate("/home")} onNew={createConversation}
                             onSelect={setActiveId} onDelete={deleteConversation}/>
            </Sidebar>

            <div className="flex-1 min-w-0 flex flex-col rounded-[18px] overflow-hidden
                            bg-var-color-00 dark:bg-var-color-36
                            border border-var-color-02 dark:border-var-color-38">
                <ChatPane key={active?.id} conversation={active} onPushMessage={pushMessage}/>
            </div>
        </section>
    );
};

export default Chat;
