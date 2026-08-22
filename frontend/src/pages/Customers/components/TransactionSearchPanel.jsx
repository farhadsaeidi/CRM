import {useState} from "react";
import {HiOutlineSearch} from "react-icons/hi";
import {IoClose} from "react-icons/io5";
import ScrollContainer from "../../../components/common/ScrollContainer.jsx";
import DateSearchField from "./DateSearchField.jsx";
import {DAY_OPTIONS, MONTH_OPTIONS, emptySearchState, searchStateToPayload} from "./dateSearch.js";

/**
 * پنل جستجوی تاریخ تراکنش — بالای نوارِ فوتر باز می‌شود، همان‌جایی که در پروژهٔ
 * CustomerManagement بود. سه کشوی سال/ماه/روز دارد که با AND ترکیب می‌شوند.
 */
const TransactionSearchPanel = ({open, onClose, onSearch, panelRef, right}) => {
    const [state, setState] = useState(emptySearchState);
    const [openDrawer, setOpenDrawer] = useState(null);

    // با بسته شدنِ پنل همهٔ کشوها هم بسته می‌شوند. راه‌های بستن یکی نیست (✕، انصراف،
    // کلیک بیرون که مستقیم در فوتر انجام می‌شود)، پس به‌جای اضافه کردن به هر کدام،
    // از روی خودِ پراپِ open تشخیص داده می‌شود — الگوی «state مشتق از props» با
    // مقایسه در حین رندر، نه افکت.
    const [wasOpen, setWasOpen] = useState(open);
    if (wasOpen !== open) {
        setWasOpen(open);
        if (!open) setOpenDrawer(null);
    }

    const toggleDrawer = (key) => setOpenDrawer((current) => (current === key ? null : key));
    const patchField = (key) => (next) => setState((prev) => ({...prev, [key]: next}));

    return (
        <section
            ref={panelRef}
            // inert در بسته بودن، فوکوس و کلیک را از کلِ پنل می‌گیرد — با
            // aria-hidden تنها، دکمه‌های داخلش هنوز با Tab در دسترس بودند.
            inert={!open}
            // فاصله از راست را فوتر می‌دهد تا لبهٔ پنل با لبهٔ کادرِ جستجو یک‌راستا
            // شود؛ تا وقتی اندازه‌گیری نشده، پنل بسته است و دیده نمی‌شود
            style={{right: right ?? 12}}
            // z زیرِ فوترِ (z-10) می‌ماند: پنل با translate به پایین می‌رود و اگر
            // بالاتر باشد در حالت بسته روی نوارِ فوتر دیده می‌شود — همان ایرادی که
            // برای منوهای دیگرِ فوتر هم اصلاح شد
            className={`fixed z-[5] w-85 max-w-[calc(100vw-1.5rem)] bottom-[calc(var(--footer-height)+0.5rem)] flex flex-col rounded-xl overflow-hidden
                        bg-var-color-00 dark:bg-var-color-37 border border-var-color-02 dark:border-var-color-38 shadow-lg
                        transition-transform duration-250 ease-[cubic-bezier(0.68,-0.6,0.32,1.25)] ${
                            open ? "translate-y-0" : "translate-y-[130%] pointer-events-none"
                        }`}
        >
            {/* هدرِ پنل */}
            <header className="w-full flex flex-row justify-between items-center py-2 pr-3 pl-1.5 bg-var-color-01 dark:bg-var-color-43 border-b border-var-color-57 dark:border-var-color-38">
                <div className="flex flex-row justify-start items-center gap-2">
                    <HiOutlineSearch className="w-4.5 h-4.5 text-var-color-15"/>
                    <h2 className="text-sm text-var-color-08 dark:text-var-color-01">جستجوی تاریخ تراکنش</h2>
                </div>
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={onClose}
                    aria-label="بستن"
                    className="w-5.5 h-5.5 cursor-pointer text-var-color-08 dark:text-var-color-01 hover:text-var-color-28 transition-all duration-200 ease-in-out"
                >
                    <IoClose className="w-full h-full"/>
                </button>
            </header>

            {/* بدنه — سه کشو */}
            <ScrollContainer className="w-full max-h-75" overflowX="hidden" autoHideDelay={400}>
                <DateSearchField label="سال" open={openDrawer === "year"} onToggle={() => toggleDrawer("year")}
                                 value={state.year} onChange={patchField("year")} maxLength={4}/>
                <DateSearchField label="ماه" open={openDrawer === "month"} onToggle={() => toggleDrawer("month")}
                                 value={state.month} onChange={patchField("month")} options={MONTH_OPTIONS}
                                 gridClass="grid-cols-4 gap-1.5" itemClass="px-3 py-1.5 text-sm whitespace-nowrap rounded-lg"/>
                {/* تقویمِ روز رو به بالا باز می‌شود: پایین‌ترین کشوی پنل است و ۳۱
                    گزینه دارد، پس رو به پایین از لبهٔ صفحه بیرون می‌زد */}
                <DateSearchField label="روز" open={openDrawer === "day"} onToggle={() => toggleDrawer("day")}
                                 value={state.day} onChange={patchField("day")} options={DAY_OPTIONS}
                                 gridClass="grid-cols-8 gap-x-1 gap-y-0.5" itemClass="w-7 h-7 text-sm rounded-full"
                                 menuPlacement="top"/>
            </ScrollContainer>

            {/* فوترِ پنل */}
            <footer className="w-full flex flex-row justify-between items-center gap-2 p-2 bg-var-color-01 dark:bg-var-color-43">
                <button
                    type="button"
                    onClick={() => {
                        setState(emptySearchState());
                        onClose();
                    }}
                    className="w-1/2 py-1 rounded-lg btn btn-redish"
                >
                    <IoClose className="w-5 h-5 ml-1"/>
                    <span className="text-[15px]">انصراف</span>
                </button>
                <button
                    type="button"
                    onClick={() => onSearch(searchStateToPayload(state))}
                    className="w-1/2 py-1 rounded-lg btn btn-bluish"
                >
                    <HiOutlineSearch className="w-4.5 h-4.5 ml-1.5"/>
                    <span className="text-[15px]">جستجو</span>
                </button>
            </footer>
        </section>
    );
};

export default TransactionSearchPanel;
