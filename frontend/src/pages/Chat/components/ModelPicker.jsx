import {useEffect, useRef, useState} from "react";
import {FiChevronDown, FiCheck} from "react-icons/fi";

/**
 * کشوی انتخابِ مدلِ زبانی، کنارِ دکمهٔ گفتار در نوارِ ابزارِ کادرِ نوشتن.
 *
 * ⚠️ **فهرست از سرور می‌آید، نه از یک آرایه در همین فایل.** فهرستِ سفید سمتِ
 * سرور است و هر شناسه‌ای بیرونِ آن بی‌صدا به پیش‌فرض برمی‌گردد؛ اگر اینجا هم
 * یک کپی می‌داشتیم، روزی کشو مدلی را نشان می‌داد که سرور نمی‌پذیرد و کاربر
 * فکر می‌کرد انتخابش اثر کرده.
 *
 * ⚠️ `<select>` بومی به کار نرفت: در RTL فلشش سمتِ اشتباه می‌افتد، ارتفاعش با
 * دکمه‌های گردِ همین نوار جور نمی‌شود، و برچسبِ «استدلالی» را نمی‌شود داخلش
 * نشاند. این کشو همان الگوی مودال‌های پروژه را دارد — Esc می‌بندد و کلیکِ بیرون
 * هم.
 */
const ModelPicker = ({models, value, onChange, disabled = false}) => {
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);

    // بستن با کلیکِ بیرون و Esc. هر دو روی document می‌نشینند چون پنل داخلِ
    // همین درخت است و رویدادِ بیرون به آن نمی‌رسد.
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (event) => {
            if (!boxRef.current?.contains(event.target)) setOpen(false);
        };
        const onKey = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    if (!models.length) return null;

    const current = models.find((m) => m.id === value) ?? models[0];

    return (
        <span ref={boxRef} className="relative inline-flex">
            <button type="button" disabled={disabled}
                    onClick={() => setOpen((prev) => !prev)}
                    aria-haspopup="listbox" aria-expanded={open}
                    aria-label={`مدل زبانی: ${current.label}`}
                    className="h-8 pr-2.5 pl-1.5 rounded-full flex items-center gap-1
                               text-[12px] font-IRANSansXFaNumMedium whitespace-nowrap
                               cursor-pointer disabled:cursor-not-allowed disabled:opacity-60
                               text-var-color-05 dark:text-var-color-39
                               enabled:hover:bg-var-color-01 dark:enabled:hover:bg-var-color-40
                               transition-colors">
                {current.label}
                <FiChevronDown className={`w-3.5 h-3.5 transition-transform duration-200
                                           ${open ? "rotate-180" : ""}`}/>
            </button>

            {/* پنل رو به **بالا** باز می‌شود: این نوار کفِ کادرِ نوشتن است و
                کشوی رو به پایین بیرونِ کارت می‌افتد. */}
            {open && (
                <ul role="listbox" aria-label="انتخاب مدل زبانی"
                    className="absolute bottom-full right-0 mb-2 z-20 w-60 max-h-72 overflow-y-auto
                               p-1 m-0 list-none rounded-xl
                               bg-var-color-00 dark:bg-var-color-36
                               border border-var-color-02 dark:border-var-color-38
                               shadow-[0_8px_28px_rgba(0,0,0,0.12)]
                               dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
                    style={{animation: "crm-rise .18s ease-out both"}}>
                    {models.map((model) => {
                        const active = model.id === current.id;
                        return (
                            <li key={model.id}>
                                <button type="button" role="option" aria-selected={active}
                                        onClick={() => {
                                            onChange(model.id);
                                            setOpen(false);
                                        }}
                                        className="w-full px-2.5 py-2 rounded-lg flex items-center gap-2
                                                   text-right cursor-pointer transition-colors
                                                   hover:bg-var-color-01 dark:hover:bg-var-color-40">
                                    <FiCheck className={`shrink-0 w-3.5 h-3.5 text-var-color-15
                                                         ${active ? "" : "invisible"}`}/>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[12.5px]
                                                         font-IRANSansXFaNumMedium
                                                         text-var-color-06 dark:text-var-color-01">
                                            {model.label}
                                        </span>
                                        <span className="block truncate text-[10.5px] mt-0.5
                                                         text-var-color-04 dark:text-var-color-39">
                                            {model.id}
                                        </span>
                                    </span>
                                    {/* «رایگان» و «استدلالی» هر دو روی تصمیمِ کاربر اثر
                                        دارند: اولی روی هزینه، دومی روی اینکه صفحه چند
                                        ثانیه ساکت می‌ماند (پارسر فقط content را می‌خواند). */}
                                    {model.free && (
                                        <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9.5px]
                                                         font-IRANSansXFaNumMedium
                                                         text-var-color-31 bg-var-color-47">
                                            رایگان
                                        </span>
                                    )}
                                    {model.reasoning && (
                                        <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9.5px]
                                                         font-IRANSansXFaNumMedium
                                                         text-var-color-53 bg-var-color-54">
                                            استدلالی
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </span>
    );
};

export default ModelPicker;
