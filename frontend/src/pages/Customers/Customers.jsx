import {useEffect, useState} from "react";
import Sidebar from "../../components/common/Sidebar.jsx";
import {NEW_CUSTOMER_EVENT} from "../../components/common/Header.jsx";
import CustomersTable from "./components/CustomersTable.jsx";
import CustomersChat from "./components/CustomersChat.jsx";
import {CustomersNavSidebar, CustomersChatSidebar} from "./components/CustomersSidebar.jsx";

// عنوانِ گفتگو از اولین پیامِ کاربر ساخته می‌شود (مثل چت مدل‌های زبانی)
const titleFrom = (body) => {
    const t = body.trim().replace(/\s+/g, " ");
    return t.length > 34 ? `${t.slice(0, 34)}…` : t;
};

const newConversation = () => ({id: `c-${Date.now()}`, title: "گفتگوی جدید", messages: []});

/**
 * پوستهٔ صفحهٔ مشتریان: سایدبارِ راست + ناحیهٔ اصلی — همان الگوی پنل‌های SAM.
 * دو نما دارد: «داشبورد» (جدول مشتریان) و «چت». با تعویضِ نما محتوای سایدبار هم
 * عوض می‌شود، در حالی که هدر و فوترِ برنامه ثابت می‌مانند.
 *
 * گفتگوها فعلاً فقط در حافظهٔ همین صفحه‌اند. نقطهٔ اتصال به سرور همین‌جاست:
 * state را با دادهٔ سرور جایگزین کنید و pushMessage را به فراخوانیِ واقعی وصل کنید.
 */
const Customers = () => {
    const [view, setView] = useState("dashboard");   // dashboard | chat
    const [conversations, setConversations] = useState([]);
    const [activeId, setActiveId] = useState(null);
    // دکمهٔ «ثبت مشتری جدید» هدر باید در نمای چت هم کار کند. اینجا فقط نما را به
    // داشبورد برمی‌گردانیم؛ خودِ مودال را جدول باز می‌کند که به همان رویداد گوش می‌دهد.
    useEffect(() => {
        const onNew = () => setView("dashboard");
        window.addEventListener(NEW_CUSTOMER_EVENT, onNew);
        return () => window.removeEventListener(NEW_CUSTOMER_EVENT, onNew);
    }, []);

    const active = conversations.find((c) => c.id === activeId) || null;

    const startChat = () => {
        setView("chat");
        if (!conversations.length) {
            const c = newConversation();
            setConversations([c]);
            setActiveId(c.id);
        } else if (!activeId) {
            setActiveId(conversations[0].id);
        }
    };

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
            if (c.id !== activeId) return c;
            const isFirstUserMsg = msg.role === "user" && c.messages.length === 0;
            return {
                ...c,
                title: isFirstUserMsg ? titleFrom(msg.body) : c.title,
                messages: [...c.messages, msg],
            };
        }));
    };

    // در موبایل عمودی می‌چیند: با flex-row سایدبارِ تمام‌عرض، ستونِ محتوا را به صفر
    // می‌رساند. آنجا سایدبار ارتفاعِ محدود می‌گیرد و محتوا زیرش می‌آید.
    return (
        <section className="h-full min-h-0 flex flex-col md:flex-row gap-3 2xs:gap-4">
            <Sidebar className="max-h-52 md:max-h-none">
                {view === "chat" ? (
                    <CustomersChatSidebar conversations={conversations} activeId={activeId}
                                          onBack={() => setView("dashboard")} onNew={createConversation}
                                          onSelect={setActiveId} onDelete={deleteConversation}/>
                ) : (
                    <CustomersNavSidebar view={view} onSelect={(v) => (v === "chat" ? startChat() : setView(v))}/>
                )}
            </Sidebar>

            {/* چت داخل کارت می‌نشیند؛ جدول کارتِ خودش را دارد و بدون پوسته رندر می‌شود
                تا اسکرولِ تودرتو و کادرِ اضافه نسازد.

                جدول با hidden پنهان می‌شود نه با unmount: هم فیلتر و صفحهٔ جاری‌اش
                حفظ می‌شود، هم شنوندهٔ رویدادِ دکمهٔ هدر زنده می‌ماند. با unmount،
                رویداد در فاصلهٔ سوییچِ نما تا mount دوباره گم می‌شد. */}
            <div className={`flex-1 min-w-0 min-h-0 ${view === "chat" ? "hidden" : ""}`}>
                <CustomersTable/>
            </div>

            {view === "chat" && (
                <div className="flex-1 min-w-0 flex flex-col rounded-[18px] overflow-hidden
                                bg-var-color-00 dark:bg-var-color-36
                                border border-var-color-02 dark:border-var-color-38">
                    <CustomersChat key={activeId} conversation={active} onPushMessage={pushMessage}/>
                </div>
            )}
        </section>
    );
};

export default Customers;
