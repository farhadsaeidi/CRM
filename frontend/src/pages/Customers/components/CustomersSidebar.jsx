import {FiArrowRight, FiGrid, FiMessageSquare, FiPlus, FiTrash2} from "react-icons/fi";
import ScrollContainer from "../../../components/common/ScrollContainer.jsx";

const itemCls = (active) =>
    `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] cursor-pointer text-right
     transition-colors duration-200 ${active
        ? "bg-var-color-12 dark:bg-var-color-44 text-var-color-19 dark:text-var-color-15 font-IRANSansXFaNumMedium"
        : "text-var-color-06 dark:text-var-color-01 hover:bg-var-color-01 dark:hover:bg-var-color-40"}`;

// ── سایدبارِ اصلی: دو آیتمِ داشبورد و چت ──
// کلاس‌های چیدمان روی div داخلی‌اند نه روی ScrollContainer: کتابخانه بین آن و
// فرزندانش عنصرِ viewport می‌گذارد، پس flex/gap/padding روی میزبان به فرزندان نمی‌رسد.
export const CustomersNavSidebar = ({view, onSelect}) => (
    <ScrollContainer className="flex-1 min-h-0" overflowX="hidden">
        <nav className="p-2.5 flex flex-col gap-1">
            <p className="m-0 px-2 pt-1 pb-2 text-[10.5px] tracking-wide text-var-color-04 dark:text-var-color-39">
                دفتر مشتریان
            </p>
            <button type="button" className={itemCls(view === "dashboard")} onClick={() => onSelect("dashboard")}>
                <FiGrid className="w-4.5 h-4.5 shrink-0"/> داشبورد
            </button>
            <button type="button" className={itemCls(view === "chat")} onClick={() => onSelect("chat")}>
                <FiMessageSquare className="w-4.5 h-4.5 shrink-0"/> چت
            </button>
        </nav>
    </ScrollContainer>
);

// ── سایدبارِ حالتِ چت: بازگشت، گفتگوی جدید، فهرست گفتگوها ──
export const CustomersChatSidebar = ({conversations, activeId, onBack, onNew, onSelect, onDelete}) => (
    <div className="flex-1 min-h-0 flex flex-col">
        {/* نوار بالا: دکمهٔ بازگشت سمت راست (شروعِ خط در RTL) */}
        <div className="shrink-0 px-2.5 pt-2.5 pb-2 flex items-center gap-2">
            <button type="button" onClick={onBack} aria-label="بازگشت به منوی اصلی"
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer
                               text-var-color-05 dark:text-var-color-39
                               hover:bg-var-color-01 dark:hover:bg-var-color-40 transition-colors duration-200">
                <FiArrowRight className="w-4.5 h-4.5"/>
            </button>
            <span className="text-[13px] font-IRANSansXFaNumMedium text-var-color-06 dark:text-var-color-01">گفتگوها</span>
        </div>

        <div className="shrink-0 px-2.5 pb-2">
            <button type="button" onClick={onNew}
                    className="w-full flex items-center justify-center gap-2 h-9.5 rounded-xl text-[13px] cursor-pointer
                               font-IRANSansXFaNumMedium bg-var-color-15 text-var-color-00
                               hover:brightness-110 active:scale-[0.98] transition-all duration-200">
                <FiPlus className="w-4.5 h-4.5"/> گفتگوی جدید
            </button>
        </div>

        <ScrollContainer className="flex-1 min-h-0" overflowX="hidden">
        <div className="px-2.5 pb-2.5 flex flex-col gap-0.5">
            {conversations.length === 0 ? (
                <p className="m-0 px-2 py-6 text-center text-[12px] text-var-color-04 dark:text-var-color-39">
                    هنوز گفتگویی نیست.
                </p>
            ) : conversations.map((c) => (
                <div key={c.id}
                     className={`group flex items-center gap-1 rounded-xl transition-colors duration-200 ${
                         c.id === activeId
                             ? "bg-var-color-12 dark:bg-var-color-44"
                             : "hover:bg-var-color-01 dark:hover:bg-var-color-40"}`}>
                    <button type="button" onClick={() => onSelect(c.id)}
                            className={`min-w-0 flex-1 text-right px-3 py-2.5 text-[12.5px] truncate cursor-pointer ${
                                c.id === activeId
                                    ? "text-var-color-19 dark:text-var-color-15 font-IRANSansXFaNumMedium"
                                    : "text-var-color-06 dark:text-var-color-01"}`}>
                        {c.title}
                    </button>
                    <button type="button" aria-label={`حذف گفتگوی ${c.title}`}
                            onClick={() => onDelete(c.id)}
                            className="shrink-0 w-7 h-7 ml-1 rounded-full items-center justify-center cursor-pointer
                                       text-var-color-04 hover:text-var-color-28 hidden group-hover:flex">
                        <FiTrash2 className="w-3.5 h-3.5"/>
                    </button>
                </div>
            ))}
        </div>
        </ScrollContainer>
    </div>
);
