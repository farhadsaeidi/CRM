import {useState} from "react";
import {FiCheck, FiChevronDown} from "react-icons/fi";
import {IoIosColorPalette} from "react-icons/io";
import MenuItem from "./MenuItem.jsx";
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
 *
 * ⚠️ همهٔ ردیف‌ها — هم خودِ «انتخاب رنگ» هم رنگ‌های داخلِ کشو — با `MenuItem`
 * ساخته می‌شوند تا هاور و بوردرشان دقیقاً همان آیتم‌های دیگرِ منو باشد.
 */

// باز شدنِ کشو و چرخشِ فلش یک حرکت‌اند، پس یک عدد دارند؛ دو مقدارِ جدا یعنی
// روزی یکی عوض می‌شود و حرکت دوتکه دیده می‌شود
const OPEN_MS = 200;

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

    return (
        <div className="w-full">
            <MenuItem
                icon={IoIosColorPalette}
                text="انتخاب رنگ"
                toggle="accent"
                // تا وقتی کشو باز است، ردیف همان زمینه و بوردرِ هاور را نگه
                // می‌دارد تا معلوم بماند این کشو از کجا باز شده
                active={open}
                expanded={open}
                onClick={() => setOpen((value) => !value)}
                trailing={
                    <FiChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform ease-out ${open ? "rotate-180" : ""}`}
                        style={{transitionDuration: `${OPEN_MS}ms`}}
                    />
                }
            />

            {open && (
                <div role="listbox" aria-label="رنگ اصلی برنامه"
                     className="mt-1 mb-0.5 pr-3 flex flex-col"
                     style={{animation: `crm-rise ${OPEN_MS}ms ease-out both`}}>
                    {ACCENTS.map((item) => {
                        const isCurrent = item.id === accent;
                        return (
                            <MenuItem
                                key={item.id}
                                text={item.label}
                                toggle="accent"
                                selected={isCurrent}
                                // ⚠️ متن و تیک با هاور رنگ عوض نمی‌کنند: اینجا
                                // نمونه‌رنگِ هر ردیف و تیکِ رنگِ فعلی خودشان
                                // نشانه‌اند، و اکسنت شدنِ متنِ ردیفِ زیرِ موس
                                // آن دو نشانه را با هم قاطی می‌کرد.
                                quietHover
                                // ⚠️ عمداً `active` نمی‌گیرد: نشانهٔ رنگِ فعلی فقط
                                // تیک است. زمینهٔ پُر روی ردیفِ انتخاب‌شده با
                                // زمینهٔ هاورِ ردیفِ زیرِ موس قاطی می‌شد و دو
                                // ردیف هم‌زمان «انتخاب‌شده» به نظر می‌رسیدند.
                                onClick={() => {
                                    setAccent(item.id);
                                    setCurrent(item.id);
                                }}
                                leading={
                                    <>
                                        {/* تیک سمتِ **راست** است: اولین فرزند در RTL
                                            راست‌ترین می‌شود. در حالتِ انتخاب‌نشده هم جا
                                            می‌گیرد (`invisible`) وگرنه با هر کلیک،
                                            ردیف‌ها یک پله جابه‌جا می‌شدند. */}
                                        <FiCheck className={`w-4 h-4 shrink-0 ${isCurrent ? "" : "invisible"}`}/>
                                        <span aria-hidden="true"
                                              style={{backgroundColor: `var(--accent-preview-${item.id})`}}
                                              className="w-4 h-4 rounded-full shrink-0 ring-1 ring-var-color-02 dark:ring-var-color-38"/>
                                    </>
                                }
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AccentPicker;
