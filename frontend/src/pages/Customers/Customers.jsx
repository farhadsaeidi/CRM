import {useCallback, useEffect, useState} from "react";
import {useSearchParams} from "react-router";
import Sidebar from "../../components/common/Sidebar.jsx";
import {NEW_CUSTOMER_EVENT} from "../../components/common/Header.jsx";
import CustomersTable from "./components/CustomersTable.jsx";
import CustomersChat from "./components/CustomersChat.jsx";
import TransactionsTable from "./components/TransactionsTable.jsx";
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
    // تراکنش‌های کدام مشتری باز است — در یوآرال می‌نشیند تا رفرش و دکمهٔ back
    // درست کار کنند و فوتر هم بداند نوارِ جستجویش را عوض کند
    const [searchParams, setSearchParams] = useSearchParams();
    const openCustomerId = searchParams.get("customer");

    const closeTransactions = useCallback(() => {
        setSearchParams((prev) => {
            const params = new URLSearchParams(prev);
            params.delete("customer");
            params.delete("tfilter");
            return params;
        });
    }, [setSearchParams]);

    // دکمهٔ «ثبت مشتری جدید» هدر باید در نمای چت و تراکنش‌ها هم کار کند. اینجا فقط
    // نما را به داشبورد برمی‌گردانیم؛ خودِ مودال را جدول باز می‌کند که به همان
    // رویداد گوش می‌دهد.
    useEffect(() => {
        const onNew = () => {
            setView("dashboard");
            closeTransactions();
        };
        window.addEventListener(NEW_CUSTOMER_EVENT, onNew);
        return () => window.removeEventListener(NEW_CUSTOMER_EVENT, onNew);
    }, [closeTransactions]);

    const active = conversations.find((c) => c.id === activeId) || null;

    const startChat = () => {
        setView("chat");
        // رفتن به چت صفحهٔ تراکنش‌ها را می‌بندد — وگرنه ‎?customer=‎ در یوآرال
        // می‌ماند و نوارِ جستجوی فوتر همچنان «تاریخ تراکنش» را نشان می‌دهد
        closeTransactions();
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
            {/* صفحهٔ تراکنش‌ها سایدبار ندارد: راهِ خروجش دکمهٔ بازگشتِ خودِ جدول است
                و کلِ عرض به دفترِ حساب می‌رسد */}
            {!openCustomerId && (
                <Sidebar className="max-h-52 md:max-h-none">
                    {view === "chat" ? (
                        <CustomersChatSidebar conversations={conversations} activeId={activeId}
                                              onBack={() => setView("dashboard")} onNew={createConversation}
                                              onSelect={setActiveId} onDelete={deleteConversation}/>
                    ) : (
                        <CustomersNavSidebar view={view} onSelect={(v) => {
                            if (v === "chat") return startChat();
                            setView(v);
                        }}/>
                    )}
                </Sidebar>
            )}

            {/* چت داخل کارت می‌نشیند؛ جدول کارتِ خودش را دارد و بدون پوسته رندر می‌شود
                تا اسکرولِ تودرتو و کادرِ اضافه نسازد.

                جدول با hidden پنهان می‌شود نه با unmount: هم فیلتر و صفحهٔ جاری‌اش
                حفظ می‌شود، هم شنوندهٔ رویدادِ دکمهٔ هدر زنده می‌ماند. با unmount،
                رویداد در فاصلهٔ سوییچِ نما تا mount دوباره گم می‌شد. */}
            <div className={`flex-1 min-w-0 min-h-0 ${view === "chat" || openCustomerId ? "hidden" : ""}`}>
                <CustomersTable/>
            </div>

            {/* تراکنش‌های یک مشتری. key تضمین می‌کند با عوض شدن مشتری، فیلتر و
                جستجوی تاریخِ مشتری قبلی روی این یکی نماند. */}
            {view !== "chat" && openCustomerId && (
                <div className="flex-1 min-w-0 min-h-0">
                    <TransactionsTable key={openCustomerId} customerId={openCustomerId} onBack={closeTransactions}/>
                </div>
            )}

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
