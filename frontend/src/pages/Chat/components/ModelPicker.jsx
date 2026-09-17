import {useCallback, useRef, useState} from "react";
import {FiChevronDown, FiCheck} from "react-icons/fi";
import ScrollContainer from "../../../components/common/ScrollContainer.jsx";
import {MENU_ROW_HOVER} from "../../../lib/menuPalette.js";
import {useDismiss} from "../../../lib/useDismiss.js";

/**
 * کشوی انتخابِ مدلِ زبانی، کنارِ دکمهٔ گفتار در نوارِ ابزارِ کادرِ نوشتن.
 *
 * ⚠️ **فهرست از سرور می‌آید، نه از یک آرایه در همین فایل.** فهرستِ سفید سمتِ
 * سرور است و هر شناسه‌ای بیرونِ آن بی‌صدا به پیش‌فرض برمی‌گردد؛ اگر اینجا هم
 * یک کپی می‌داشتیم، روزی کشو مدلی را نشان می‌داد که سرور نمی‌پذیرد و کاربر
 * فکر می‌کرد انتخابش اثر کرده.
 *
 * ⚠️ `<select>` بومی به کار نرفت: در RTL فلشش سمتِ اشتباه می‌افتد، ارتفاعش با
 * دکمه‌های گردِ همین نوار جور نمی‌شود، و شناسهٔ مدل را نمی‌شود زیرِ نامش نشاند.
 * این کشو همان الگوی مودال‌های پروژه را دارد — Esc می‌بندد و کلیکِ بیرون هم.
 *
 * 📌 برچسب‌های «رایگان» و «استدلالی» عمداً برداشته شده‌اند؛ هر ردیف فقط نام و
 * شناسهٔ مدل را نشان می‌دهد. `free` و `reasoning` هنوز در پاسخِ سرور هستند.
 */
const ModelPicker = ({models, value, onChange, disabled = false}) => {
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);

    // بستن با کلیکِ بیرون و Esc — همان هوکی که منوی سه‌نقطهٔ سایدبار هم
    // استفاده می‌کند. اینجا `onScroll` لازم نیست: پنل `absolute` است و با
    // دکمه‌اش جابه‌جا می‌شود.
    const close = useCallback(() => setOpen(false), []);
    useDismiss(open, close, boxRef);

    if (!models.length) return null;

    const current = models.find((m) => m.id === value) ?? models[0];

    return (
        <span ref={boxRef} className="relative inline-flex">
            <button type="button" disabled={disabled}
                    onClick={() => setOpen((prev) => !prev)}
                    aria-haspopup="listbox" aria-expanded={open}
                    aria-label={`مدل زبانی: ${current.label}`}
                    className="h-8 pr-1.5 pl-2.5 rounded-full flex items-center gap-1
                               text-[12px] font-IRANSansXFaNumMedium whitespace-nowrap
                               cursor-pointer disabled:cursor-not-allowed disabled:opacity-60
                               text-var-color-05 dark:text-var-color-39
                               enabled:hover:bg-var-color-01 dark:enabled:hover:bg-var-color-40
                               transition-colors">
                {/* ⚠️ فلش **اول** در DOM می‌آید تا در RTL سمتِ راستِ برچسب بنشیند —
                    همان تلهٔ همیشگی: اولین فرزند، راست‌ترین است. پدینگ هم با آن
                    قرینه شد (pr کم، pl زیاد)، وگرنه فلش به لبه می‌چسبید. */}
                <FiChevronDown className={`w-3.5 h-3.5 transition-transform duration-200
                                           ${open ? "rotate-180" : ""}`}/>
                {current.label}
            </button>

            {/* پنل رو به **بالا** باز می‌شود: این نوار کفِ کادرِ نوشتن است و
                کشوی رو به پایین بیرونِ کارت می‌افتد. */}
            {open && (
                <div className="absolute bottom-full left-0 mb-2 z-20 w-60 rounded-xl overflow-hidden
                                bg-var-color-00 dark:bg-var-color-36
                                border border-var-color-02 dark:border-var-color-38
                                shadow-[0_8px_28px_rgba(0,0,0,0.12)]
                                dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
                     style={{animation: "crm-rise .18s ease-out both"}}>
                    {/* ⚠️ اسکرول با ScrollContainer است نه overflow-auto — قاعدهٔ کلِ
                        پروژه. کلاسِ اندازه (`max-h-*`) روی خودش می‌ماند و پدینگِ
                        محتوا روی `ul`ِ داخلی می‌رود، چون کتابخانه بینشان عنصرِ
                        viewport می‌گذارد. trackPadding برابرِ شعاعِ گوشه است تا ریل
                        کنارِ انحنا نزند. */}
                    <ScrollContainer className="max-h-72" overflowX="hidden" trackPadding={12}>
                        <ul role="listbox" aria-label="انتخاب مدل زبانی" className="p-1 m-0 list-none">
                            {models.map((model) => {
                                const active = model.id === current.id;
                                return (
                                    <li key={model.id}>
                                        <button type="button" role="option" aria-selected={active}
                                                onClick={() => {
                                                    onChange(model.id);
                                                    setOpen(false);
                                                }}
                                                className={`group w-full px-2.5 py-2 rounded-lg flex items-center
                                                            gap-2 text-right cursor-pointer transition-colors
                                                            bg-transparent border border-transparent
                                                            ${MENU_ROW_HOVER}`}>
                                            <FiCheck className={`shrink-0 w-3.5 h-3.5 text-var-color-15
                                                                 ${active ? "" : "invisible"}`}/>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[12.5px]
                                                                 font-IRANSansXFaNumMedium transition-colors
                                                                 text-var-color-06 dark:text-var-color-01
                                                                 group-hover:text-var-color-19
                                                                 dark:group-hover:text-var-color-15">
                                                    {model.label}
                                                </span>
                                                <span className="block truncate text-[10.5px] mt-0.5
                                                                 text-var-color-04 dark:text-var-color-39">
                                                    {model.id}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </ScrollContainer>
                </div>
            )}
        </span>
    );
};

export default ModelPicker;
