import {useCallback, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {FiChevronUp, FiPlus, FiRefreshCw} from "react-icons/fi";
import {IoClose} from "react-icons/io5";
import {toEnglishDigits} from "../../../lib/utils.js";
import {MODE_ITEMS, MODES, emptyField, isFieldFilled} from "./dateSearch.js";

// یک کشوی جستجوی تاریخ — همین یک کامپوننت برای هر سه جزء (سال، ماه، روز) به کار
// می‌رود. در پروژهٔ قدیمی چهار کامپوننت تقریباً یکسان و حدود ۲۰۰۰ خط برای همین
// کار وجود داشت که کم‌کم از هم واگرا شده بودند؛ خودِ نویسنده هم در نسخهٔ آخر
// ماه و روز را در یک کامپوننت ادغام کرده بود.
//
// تفاوت سال با ماه/روز فقط در شکلِ ورودی است: سال ورودیِ متنی می‌گیرد و ماه و روز
// از فهرستِ بسته انتخاب می‌شوند. با پراپ `options` همین یک تفاوت بیان می‌شود.

// عرض عمداً اینجا نیست: هر جای مصرف عرضِ خودش را می‌دهد. با `w-full` در این رشته،
// کلاسِ عرضِ محلی و `w-full` هر دو تولید می‌شدند و برنده شدنشان به ترتیبِ CSS
// بستگی داشت نه به ترتیبِ نوشتن.
const smallInput =
    "h-7 rounded-md text-sm text-center font-IRANSansXFaNumUltraLight input input-bluish input-placeholder";
const iconBtn =
    "w-5.5 h-5.5 shrink-0 flex justify-center items-center cursor-pointer transition-all duration-200 ease-in-out " +
    "disabled:opacity-40 disabled:cursor-default";

/**
 * دکمهٔ انتخاب از فهرست (ماه و روز). فهرست با پرتال بیرونِ کشو رندر می‌شود چون
 * بدنهٔ پنل اسکرول دارد و منوی absolute داخلش بریده می‌شد — همان راه‌حلی که برای
 * منوی فیلترِ جدول مشتریان هم به کار رفت.
 */
const OptionPicker = ({options, value, onSelect, placeholder, gridClass, itemClass, disabled}) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const btnRef = useRef(null);
    const menuRef = useRef(null);

    const place = useCallback(() => {
        const rect = btnRef.current?.getBoundingClientRect();
        if (rect) setPos({top: rect.bottom + 6, right: window.innerWidth - rect.right});
    }, []);

    useEffect(() => {
        if (!open) return;
        const frame = requestAnimationFrame(place);
        const onDocClick = (e) => {
            if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener("click", onDocClick);
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener("click", onDocClick);
            window.removeEventListener("resize", place);
            window.removeEventListener("scroll", place, true);
        };
    }, [open, place]);

    const selected = options.find((item) => String(item.value) === String(value));

    return (
        <>
            <button
                type="button"
                ref={btnRef}
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                className={`w-full h-7 flex flex-row justify-between items-center gap-1 px-2 rounded-md text-sm cursor-pointer input input-bluish ${
                    selected ? "" : "text-var-color-04! dark:text-var-color-05!"
                }`}
            >
                <span className="truncate font-IRANSansXFaNumUltraLight">{selected ? selected.label : placeholder}</span>
                <FiChevronUp className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ease-in-out ${open ? "rotate-0" : "rotate-180"}`}/>
            </button>

            {createPortal(
                <div
                    ref={menuRef}
                    // بسته که باشد نه کلیک می‌گیرد نه فوکوس؛ چون بیرونِ پنل (روی body)
                    // رندر می‌شود، inertِ خودِ پنل شاملش نمی‌شود
                    inert={!open}
                    className={`fixed p-2 rounded-xl bg-var-color-00 dark:bg-var-color-43 border border-var-color-02 dark:border-var-color-38 shadow-md dark:shadow-lg z-[60] origin-top transition duration-200 ease-[cubic-bezier(0.68,-0.6,0.32,1.25)] ${
                        open ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-0 pointer-events-none"
                    }`}
                    style={{top: pos?.top ?? -9999, right: pos?.right ?? 16}}
                >
                    <div className={`grid ${gridClass}`}>
                        {options.map((item) => {
                            const active = String(item.value) === String(value);
                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => {
                                        onSelect(String(item.value));
                                        setOpen(false);
                                    }}
                                    className={`${itemClass} font-IRANSansXFaNumUltraLight border transition-all duration-200 ease-in-out ${
                                        active
                                            ? "bg-var-color-15 text-var-color-11 border-var-color-15 cursor-default"
                                            : "bg-transparent border-transparent text-var-color-08 dark:text-var-color-46 cursor-pointer hover:bg-var-color-17 dark:hover:bg-var-color-40 hover:border-var-color-13 dark:hover:border-var-color-41"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

const DateSearchField = ({label, open, onToggle, value, onChange, options, gridClass, itemClass, maxLength = 4, placeholder = "--انتخاب کنید--"}) => {
    const isPicker = Boolean(options);
    const filled = isFieldFilled(value);

    const patch = (changes) => onChange({...value, ...changes});
    // فقط رقمِ انگلیسی می‌ماند تا ورودیِ فارسی هم بدون دردسر به سرور برود
    const digits = (raw) => toEnglishDigits(raw).replace(/\D/g, "").slice(0, maxLength);

    const reset = () => {
        const cleared = {...emptyField(), mode: value.mode};
        onChange(cleared);
    };

    const setCustomAt = (index, next) => {
        const custom = value.custom.map((item, i) => (i === index ? next : item));
        patch({custom});
    };

    const renderTextInput = (key, extraClass = "") => (
        <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={value[key]}
            onChange={(e) => patch({[key]: digits(e.target.value)})}
            className={`${smallInput} ${extraClass}`}
        />
    );

    const renderPicker = (key, extraClass = "") => (
        <div className={extraClass}>
            <OptionPicker
                options={options}
                value={value[key]}
                onSelect={(next) => patch({[key]: next})}
                placeholder={placeholder}
                gridClass={gridClass}
                itemClass={itemClass}
            />
        </div>
    );

    const renderValue = (key, extraClass) => (isPicker ? renderPicker(key, extraClass) : renderTextInput(key, extraClass));

    return (
        <section className="w-full">
            {/* سرِ کشو */}
            <button
                type="button"
                onClick={onToggle}
                className={`w-full flex flex-row justify-between items-center cursor-pointer p-3 pr-4 text-[15px] font-IRANSansXFaNumLight border-b border-var-color-57 dark:border-var-color-38 transition-all duration-200 ease-in-out ${
                    open ? "bg-var-color-59 dark:bg-var-color-52" : "bg-var-color-00 dark:bg-var-color-37"
                } hover:bg-var-color-59 dark:hover:bg-var-color-52 text-var-color-06 dark:text-var-color-39`}
            >
                <span className="flex flex-row items-center gap-2">
                    {label}
                    {/* نشانهٔ پر بودن — با بسته بودن کشو هم معلوم است این جزء در جستجو نقش دارد */}
                    {filled && <span className="w-1.5 h-1.5 rounded-full bg-var-color-15"/>}
                </span>
                <FiChevronUp className={`w-4.5 h-4.5 transition-transform duration-200 ease-in-out ${open ? "rotate-0" : "rotate-180"}`}/>
            </button>

            {/* بدنهٔ کشو */}
            {open && (
                <div className="flex flex-col justify-start items-center gap-2.5 px-4 py-3 bg-var-color-49 dark:bg-var-color-38 border-b border-var-color-57 dark:border-var-color-38">
                    {/* انتخابِ حالت */}
                    <div className="flex flex-row justify-center items-center gap-8">
                        {MODE_ITEMS.map((item) => {
                            const active = value.mode === item.key;
                            return (
                                // خودِ متن هم باید کلیک‌پذیر باشد؛ با label دورِ دکمه
                                // فقط نقطهٔ کوچکِ رادیو هدف کلیک بود
                                <button
                                    key={item.key}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => patch({mode: item.key})}
                                    className={`group flex items-center gap-1.25 text-[13px] text-var-color-06 dark:text-var-color-39 ${
                                        active ? "cursor-default" : "cursor-pointer"
                                    }`}
                                >
                                    <span className={`w-3.25 h-3.25 rounded-full border transition-all duration-200 ease-in-out ${
                                        active
                                            ? "bg-var-color-15 border-var-color-15"
                                            : "bg-transparent border-var-color-04 dark:border-var-color-05 group-hover:border-var-color-15"
                                    }`}/>
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* حالت «مشخص» */}
                    {value.mode === MODES.SPECIFIC && (
                        <div className="w-full flex flex-row justify-center items-center gap-0.75">
                            {renderValue("specific", "w-35")}
                            <button type="button" tabIndex={-1} disabled={!filled} onClick={reset} aria-label="بازنشانی"
                                    className={`${iconBtn} text-var-color-06 dark:text-var-color-39 enabled:hover:text-var-color-15`}>
                                <FiRefreshCw className="w-3.25 h-3.25"/>
                            </button>
                        </div>
                    )}

                    {/* حالت «بازه» — در ماه و روز اگر «از» بزرگ‌تر از «تا» باشد بازه دور
                        می‌زند (مثلاً بهمن تا اردیبهشت)؛ منطقش سمت سرور است */}
                    {value.mode === MODES.RANGE && (
                        <div className="w-full flex flex-row justify-center items-center gap-0.75">
                            <span className="text-var-color-06 dark:text-var-color-39 text-sm">از:</span>
                            {renderValue("from", "w-24 ml-2")}
                            <span className="text-var-color-06 dark:text-var-color-39 text-sm">تا:</span>
                            {renderValue("to", "w-24")}
                            <button type="button" tabIndex={-1} disabled={!filled} onClick={reset} aria-label="بازنشانی"
                                    className={`${iconBtn} text-var-color-06 dark:text-var-color-39 enabled:hover:text-var-color-15`}>
                                <FiRefreshCw className="w-3.25 h-3.25"/>
                            </button>
                        </div>
                    )}

                    {/* حالت «نامنظم» — چند مقدارِ دلخواه */}
                    {value.mode === MODES.CUSTOM && (
                        <div className="w-full flex flex-col justify-start items-center gap-2">
                            {value.custom.map((item, index) => (
                                <div key={index} className="w-full flex flex-row justify-center items-center gap-0.75">
                                    {/* افزودن فقط از ردیفی که پر شده باشد — وگرنه ردیف‌های خالی روی هم می‌مانند */}
                                    <button type="button" tabIndex={-1} aria-label="افزودن"
                                            disabled={!String(item).trim() || index !== value.custom.length - 1}
                                            onClick={() => patch({custom: [...value.custom, ""]})}
                                            className={`${iconBtn} text-var-color-15`}>
                                        <FiPlus className="w-full h-full"/>
                                    </button>

                                    {isPicker ? (
                                        <div className="w-30">
                                            <OptionPicker
                                                options={options}
                                                value={item}
                                                onSelect={(next) => setCustomAt(index, next)}
                                                placeholder={placeholder}
                                                gridClass={gridClass}
                                                itemClass={itemClass}
                                            />
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            value={item}
                                            onChange={(e) => setCustomAt(index, digits(e.target.value))}
                                            className={`${smallInput} w-30`}
                                        />
                                    )}

                                    {index === 0 ? (
                                        <button type="button" tabIndex={-1} disabled={!filled} onClick={reset} aria-label="بازنشانی"
                                                className={`${iconBtn} text-var-color-06 dark:text-var-color-39 enabled:hover:text-var-color-15`}>
                                            <FiRefreshCw className="w-3.25 h-3.25"/>
                                        </button>
                                    ) : (
                                        <button type="button" tabIndex={-1} aria-label="حذف"
                                                onClick={() => patch({custom: value.custom.filter((_, i) => i !== index)})}
                                                className={`${iconBtn} text-var-color-28`}>
                                            <IoClose className="w-full h-full"/>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default DateSearchField;
