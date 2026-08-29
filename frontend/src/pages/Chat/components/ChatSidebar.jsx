import {useCallback, useEffect, useRef, useState} from "react";
import {FiArrowRight, FiEdit2, FiMoreVertical, FiPlus, FiTrash2} from "react-icons/fi";
import ScrollContainer from "../../../components/common/ScrollContainer.jsx";
import CustomTooltip from "../../../components/common/CustomTooltip.jsx";
import ConversationMenu from "./ConversationMenu.jsx";


// ── سایدبارِ حالتِ چت: بازگشت، گفتگوی جدید، فهرست گفتگوها ──
const ChatSidebar = ({conversations, activeId, loading = false,
                      onBack, onNew, onSelect, onDelete, onRename}) => {
    // تولتیپِ شناور و نه کلاسِ `custom-tooltip`: خودِ سایدبار overflow-hidden دارد
    // (برای گردیِ گوشه‌ها) و این دکمه در بالاترین نقطه‌اش است، پس تولتیپِ
    // شبه‌عنصری که رو به بالا باز می‌شود بریده می‌شد.
    const backBtnRef = useRef(null);
    const [tooltip, setTooltip] = useState({pos: null, visible: false});
    const showTooltip = () => {
        const rect = backBtnRef.current?.getBoundingClientRect();
        if (rect) setTooltip({pos: {top: rect.top, left: rect.left + rect.width / 2}, visible: true});
    };
    const hideTooltip = () => setTooltip((t) => ({...t, visible: false}));

    // منوی سه‌نقطه: کدام گفتگو، و مختصاتِ دکمه‌اش روی صفحه. یک منو برای کلِ
    // فهرست رندر می‌شود نه یکی به‌ازای هر ردیف — با پنجاه گفتگو یعنی پنجاه لایهٔ
    // شناور که فقط یکی‌شان دیده می‌شود.
    const [menu, setMenu] = useState(null);
    const closeMenu = useCallback(() => setMenu(null), []);
    const openMenu = (id, event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setMenu((prev) => (prev?.id === id ? null : {id, rect}));
    };

    // تغییرِ نام درجا انجام می‌شود نه با مودال: عنوان فقط برچسبِ همین ردیف است و
    // یک پنجرهٔ جدا برای یک فیلد، کارِ ساده را سنگین می‌کند.
    const [renaming, setRenaming] = useState(null);   // {id, draft}
    const inputRef = useRef(null);
    // متن از اول انتخاب می‌شود تا بازنویسی یک تایپ باشد، نه پاک کردن و نوشتن
    useEffect(() => {
        inputRef.current?.select();
    }, [renaming?.id]);

    const commitRename = () => {
        if (!renaming) return;
        const title = renaming.draft.trim();
        const current = conversations.find((c) => c.id === renaming.id);
        // نامِ خالی یا بی‌تغییر فقط بسته می‌شود: ذخیرهٔ رشتهٔ خالی یعنی ردیفی
        // بی‌برچسب که دیگر از بقیه تشخیص داده نمی‌شود.
        if (title && title !== current?.title) onRename(renaming.id, title);
        setRenaming(null);
    };

    return (
    <div className="flex-1 min-h-0 flex flex-col">
        {/* نوار بالا: دکمهٔ بازگشت سمت راست (شروعِ خط در RTL) */}
        <div className="shrink-0 px-2.5 pt-2.5 pb-2 flex items-center gap-2">
            <button type="button" ref={backBtnRef} aria-label="بازگشت"
                    onClick={() => {
                        hideTooltip();
                        onBack();
                    }}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer
                               text-var-color-05 dark:text-var-color-39
                               hover:bg-var-color-01 dark:hover:bg-var-color-40 transition-colors duration-200">
                <FiArrowRight className="w-4.5 h-4.5"/>
            </button>
            <span className="text-[13px] font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">گفتگوها</span>
        </div>

        <CustomTooltip text="بازگشت" pos={tooltip.pos} visible={tooltip.visible}/>

        <div className="shrink-0 px-2.5 pb-2">
            <button type="button" onClick={onNew}
                    className="w-full flex items-center justify-center gap-2 h-9.5 rounded-xl text-[13px] cursor-pointer
                               font-IRANSansXFaNumMedium bg-var-color-15 text-var-color-11
                               hover:brightness-110 active:scale-[0.98] transition-all duration-200">
                <FiPlus className="w-4.5 h-4.5"/> گفتگوی جدید
            </button>
        </div>

        <ScrollContainer className="flex-1 min-h-0" overflowX="hidden">
        <div className="px-2.5 pb-2.5 flex flex-col gap-0.5">
            {/* حالتِ بارگذاری با اسکلت پر می‌شود نه با «هنوز گفتگویی نیست» —
                دومی دروغ است تا وقتی هنوز نمی‌دانیم چیزی هست یا نه */}
            {loading ? (
                [0, 1, 2].map((i) => (
                    <div key={i} className="animate-pulse h-9 mx-0.5 my-0.5 rounded-xl
                                            bg-var-color-01 dark:bg-var-color-40"/>
                ))
            ) : conversations.length === 0 ? (
                <p className="m-0 px-2 py-6 text-center text-[12px] text-var-color-04 dark:text-var-color-39">
                    هنوز گفتگویی نیست.
                </p>
            ) : conversations.map((c) => (
                <div key={c.id}
                     className={`group flex items-center gap-1 rounded-xl transition-colors duration-200 ${
                         c.id === activeId
                             ? "bg-var-color-01 dark:bg-var-color-37"
                             : "hover:bg-var-color-01 dark:hover:bg-var-color-40"}`}>
                    {renaming?.id === c.id ? (
                        <input ref={inputRef} value={renaming.draft} autoFocus
                               onChange={(e) => setRenaming({id: c.id, draft: e.target.value})}
                               onBlur={commitRename}
                               onKeyDown={(e) => {
                                   if (e.key === "Enter") commitRename();
                                   // ⚠️ Esc باید ویرایش را **پیش از** blur دور
                                   // بریزد، وگرنه blurِ بعدی همان متنِ ناتمام را
                                   // ذخیره می‌کرد.
                                   if (e.key === "Escape") setRenaming(null);
                               }}
                               className="min-w-0 flex-1 mx-1.5 my-1 px-1.5 py-1.5 rounded-lg text-[12.5px]
                                          bg-var-color-00 dark:bg-var-color-35
                                          border border-var-color-15 focus:outline-none
                                          text-var-color-06 dark:text-var-color-01"/>
                    ) : (
                        <button type="button" onClick={() => onSelect(c.id)}
                                className={`min-w-0 flex-1 text-right px-3 py-2.5 text-[12.5px] truncate
                                             cursor-pointer text-var-color-06 dark:text-var-color-01 ${
                                    c.id === activeId ? "font-IRANSansXFaNumMedium" : ""}`}>
                            {c.title}
                        </button>
                    )}
                    {/* ⚠️ دکمه تا وقتی منویش باز است دیده می‌شود، وگرنه با رفتنِ
                        موس روی خودِ منو `group-hover` می‌رفت و دکمه زیرِ منوی
                        بازِ خودش ناپدید می‌شد. همان حالت پس‌زمینه‌اش را هم نگه
                        می‌دارد تا پیدا باشد منو مالِ کدام ردیف است.

                        رنگ‌ها از کادرِ نوشتنِ همین صفحه قرض گرفته شده‌اند تا
                        سایدبار و کادرِ چت یک زبان داشته باشند: پس‌زمینهٔ هاور
                        همان پس‌زمینهٔ هاورِ دکمهٔ «+» است (۰۱ و ۴۰)، و نقطه‌ها
                        در حالتِ عادی یک پله کم‌رنگ‌تر از متنِ ردیف‌اند و با
                        هاور به خودِ همان رنگ می‌رسند.

                        ⚠️ **روی ردیفِ غیرفعال، پس‌زمینهٔ هاورِ این دکمه با
                        پس‌زمینهٔ هاورِ خودِ ردیف یکی است، پس دیده نمی‌شود** —
                        هر دو ۰۱ و ۴۰اند. نشانهٔ هاور آنجا پررنگ شدنِ نقطه‌هاست
                        نه پس‌زمینه. عمدی است و خواستهٔ صاحبِ پروژه؛ اگر روزی
                        باید دیده شود، رنگِ هاورِ ردیف باید عوض شود نه این. */}
                    <button type="button" aria-label={`عملیات گفتگوی ${c.title}`}
                            aria-haspopup="menu" aria-expanded={menu?.id === c.id}
                            onClick={(event) => openMenu(c.id, event)}
                            className={`shrink-0 w-7 h-7 ml-1 rounded-lg items-center justify-center
                                        cursor-pointer transition-all duration-200 active:scale-90
                                        text-var-color-05 dark:text-var-color-46
                                        hover:bg-var-color-01 dark:hover:bg-var-color-40
                                        hover:text-var-color-06 dark:hover:text-var-color-01 ${
                                menu?.id === c.id
                                    ? "flex bg-var-color-01 dark:bg-var-color-40 " +
                                      "text-var-color-06 dark:text-var-color-01"
                                    : "hidden group-hover:flex"}`}>
                        <FiMoreVertical className="w-4 h-4"/>
                    </button>
                </div>
            ))}
        </div>
        </ScrollContainer>

        {/* بیرونِ ScrollContainer: پنلِ `fixed` را viewportِ کتابخانه نمی‌بُرد */}
        <ConversationMenu
            rect={menu?.rect ?? null} onClose={closeMenu}
            items={[
                {
                    key: "rename", label: "تغییر نام", icon: FiEdit2,
                    onSelect: () => {
                        const row = conversations.find((c) => c.id === menu.id);
                        setRenaming({id: menu.id, draft: row?.title ?? ""});
                    },
                },
                {key: "delete", label: "حذف", icon: FiTrash2, danger: true,
                 onSelect: () => onDelete(menu.id)},
            ]}/>
    </div>
    );
};

export default ChatSidebar;
