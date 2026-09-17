import {useState} from "react";
import {FiCheck, FiChevronDown, FiDroplet} from "react-icons/fi";
import {ACCENTS, getAccent, setAccent} from "../../lib/accent.js";

/**
 * «انتخاب رنگ» در منوی حساب کاربری: یک ردیف که با کلیک، کشوی رنگ‌ها زیرش باز
 * می‌شود و با انتخابِ هر رنگ، رنگِ اصلیِ کلِ برنامه عوض می‌شود.
 *
 * ⚠️ **کشو با رندرِ شرطی باز می‌شود، نه با ترنزیشنِ `grid-template-rows: 0fr→1fr`.**
 * آن الگو یک‌بار در همین پروژه (کشوهای جستجوی تاریخ) در فایرفاکس اصلاً باز نشد و
 * کاربر فکر کرد قابلیت خراب است — تله‌ای که در `CLAUDE.md` ثبت شده.
 *
 * ⚠️ منو بعد از انتخاب **بسته نمی‌شود**: کاربر رنگ‌ها را با هم مقایسه می‌کند و
 * بستن یعنی برای دیدنِ رنگِ بعدی باید دوباره دو کلیک کند.
 */
const AccentPicker = ({menuOpen = true}) => {
    const [open, setOpen] = useState(false);
    const [accent, setCurrent] = useState(getAccent);

    // با بسته شدنِ منوی حساب، کشو هم جمع می‌شود — با مقایسه در حین رندر نه افکت،
    // چون قاعدهٔ `react-hooks/set-state-in-effect` در این پروژه setStateِ همگام
    // داخلِ بدنهٔ افکت را رد می‌کند.
    const [lastMenuOpen, setLastMenuOpen] = useState(menuOpen);
    if (lastMenuOpen !== menuOpen) {
        setLastMenuOpen(menuOpen);
        if (!menuOpen && open) setOpen(false);
    }

    const current = ACCENTS.find((item) => item.id === accent) ?? ACCENTS[0];

    return (
        <div className="w-full">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className="w-full flex flex-row justify-start items-center gap-2.5 py-1.5 px-2.5 my-px
                           rounded-[10px] border border-transparent bg-transparent cursor-pointer
                           font-IRANSansXFaNumRegular text-[15px] transition-all duration-200 ease-in-out
                           text-var-color-08 dark:text-var-color-46
                           hover:bg-var-color-17 dark:hover:bg-var-color-40
                           hover:text-var-color-19 dark:hover:text-var-color-46
                           hover:border-var-color-13 dark:hover:border-var-color-41"
            >
                <FiDroplet className="w-5 h-5 shrink-0"/>
                <span>انتخاب رنگ</span>
                {/* در RTL «انتهای خط» چپ است، پس `mr-auto` این گروه را به چپ می‌برد */}
                <span className="mr-auto flex flex-row items-center gap-2">
                    <span aria-hidden="true"
                          style={{backgroundColor: `var(--accent-preview-${current.id})`}}
                          className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-var-color-02 dark:ring-var-color-38"/>
                    <FiChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                        open ? "rotate-180" : ""}`}/>
                </span>
            </button>

            {open && (
                <div role="listbox" aria-label="رنگ اصلی برنامه"
                     className="mt-1 mb-0.5 pr-3 flex flex-col"
                     style={{animation: "crm-rise .18s ease-out both"}}>
                    {ACCENTS.map((item) => {
                        const selected = item.id === current.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                    setAccent(item.id);
                                    setCurrent(item.id);
                                }}
                                className={`w-full flex flex-row justify-start items-center gap-2.5 py-1.5 px-2.5 my-px
                                            rounded-[10px] border font-IRANSansXFaNumRegular text-[14.5px]
                                            transition-all duration-200 ease-in-out ${
                                    selected
                                        ? "cursor-default bg-var-color-17 dark:bg-var-color-40 text-var-color-19 dark:text-var-color-46 border-var-color-13 dark:border-var-color-41"
                                        : "cursor-pointer bg-transparent border-transparent text-var-color-08 dark:text-var-color-46 hover:bg-var-color-17 dark:hover:bg-var-color-40 hover:border-var-color-13 dark:hover:border-var-color-41"}`}
                            >
                                {/* تیک سمتِ **راست** است: اولین فرزند در RTL راست‌ترین می‌شود.
                                    در حالتِ انتخاب‌نشده هم جا می‌گیرد (`invisible`) وگرنه با
                                    هر کلیک، ردیف‌ها یک پله جابه‌جا می‌شدند. */}
                                <FiCheck className={`w-4 h-4 shrink-0 ${selected ? "" : "invisible"}`}/>
                                <span aria-hidden="true"
                                      style={{backgroundColor: `var(--accent-preview-${item.id})`}}
                                      className="w-4 h-4 rounded-full shrink-0 ring-1 ring-var-color-02 dark:ring-var-color-38"/>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AccentPicker;
