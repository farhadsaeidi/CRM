import {FiArrowDownLeft, FiArrowUpLeft} from "react-icons/fi";
import {faNumber, faPercent} from "../../lib/chart.js";
import {useCountUp} from "../../lib/useCountUp.js";

/**
 * کارتِ KPI — عددِ درشت با شمارشِ انیمیشنی، و دلتای دورهٔ قبل.
 *
 * الگویش از همان داشبوردهای مرجع است: عنوان، عددِ بزرگ، و یک خطِ دلتا با فلشِ
 * رنگی. تفاوتِ مهم: اگر دورهٔ قبل صفر یا ناموجود باشد، درصدِ تغییر بی‌معناست و
 * به‌جای «۱۰۰٪ رشد» چیزی نشان داده نمی‌شود.
 */

// آیا بالا رفتنِ این شاخص خبرِ خوبی است؟ نسیهٔ بیشتر لزوماً خوب نیست، وصولیِ
// بیشتر هست — پس رنگِ دلتا نمی‌تواند برای همه یکسان باشد.
const TONE = {
    good: {up: "text-var-color-31", down: "text-var-color-28"},
    bad: {up: "text-var-color-28", down: "text-var-color-31"},
    neutral: {up: "text-var-color-15", down: "text-var-color-15"},
};

const KpiCard = ({
    title, value, suffix, suffixClass = "", icon: Icon, delay = 0,
    delta, previousLabel, tone = "good", accent = "var(--color-var-color-15)",
    // نمایشِ دلخواه به‌جای عددِ خام (مثلاً درصد یا «طلبکار/بدهکار»)
    format = faNumber, hint, hintClass,
    // کارتِ کلیک‌پذیر (مثلاً میان‌برِ فیلترِ جدول) و حالتِ «فیلترش فعال است»
    onClick, active = false,
}) => {
    const animated = useCountUp(Number(value) || 0);
    const hasDelta = delta !== null && delta !== undefined;
    const up = hasDelta && delta >= 0;
    const deltaClass = hasDelta ? TONE[tone][up ? "up" : "down"] : "";
    const DeltaIcon = up ? FiArrowUpLeft : FiArrowDownLeft;

    // ⚠️ کارت داخلِ <button> گذاشته نمی‌شود: بدنه‌اش <p> و <strong> دارد و
    // دکمه فقط محتوای عبارتی می‌پذیرد. پس خودِ کارت نقشِ دکمه می‌گیرد و
    // کیبورد را هم دستی پشتیبانی می‌کند.
    const clickable = typeof onClick === "function";
    const interactive = clickable ? {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick(event);
            }
        },
    } : {};

    return (
        <section
            {...interactive}
            style={{animationDelay: `${delay}ms`, ...(active ? {borderColor: accent} : {})}}
            className={`animate-fade-up group relative min-w-0 overflow-hidden flex flex-col justify-between gap-3
                        rounded-[18px] p-4 bg-var-color-00 dark:bg-var-color-36
                        border transition-colors duration-300
                        ${active ? "" : "border-var-color-02 dark:border-var-color-38"}
                        ${clickable ? "cursor-pointer" : ""}
                        hover:border-var-color-14 dark:hover:border-var-color-16`}
        >
            {/* هالهٔ رنگیِ گوشه — همان لهجهٔ بصریِ کارت‌های مرجع. در RTL گوشهٔ
                شروعِ خط سمت راست است، پس هاله همان‌جا می‌نشیند. */}
            <span aria-hidden="true"
                  style={{background: accent}}
                  className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.07]
                             blur-2xl transition-transform duration-500 group-hover:scale-125"/>

            <div className="relative flex flex-row items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="m-0 text-[12px] text-var-color-04 dark:text-var-color-39 truncate">{title}</p>
                    <p className="m-0 mt-1.5 flex flex-row items-baseline gap-1.5 min-w-0">
                        <strong className="text-[26px] leading-none font-IRANSansXFaNumDemiBold tracking-tight
                                           text-var-color-08 dark:text-var-color-01">
                            {format(animated)}
                        </strong>
                        {/* رنگِ پسوند از رنگِ کارت جداست: کارت هویتِ خودش را دارد و
                            پسوند می‌تواند معنای عدد (طلب یا بدهی) را برساند */}
                        {suffix && (
                            <span className={`text-[11px] shrink-0 ${
                                suffixClass || "text-var-color-04 dark:text-var-color-39"
                            }`}>{suffix}</span>
                        )}
                    </p>
                </div>
                {Icon && (
                    <span style={{color: accent, borderColor: accent}}
                          className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center
                                     border opacity-90 bg-var-color-01 dark:bg-var-color-40">
                        <Icon className="w-4.5 h-4.5"/>
                    </span>
                )}
            </div>

            <div className="relative flex flex-row items-center gap-1.5 text-[11px] min-w-0">
                {hasDelta ? (
                    <>
                        <span className={`flex flex-row items-center gap-0.5 font-IRANSansXFaNumMedium ${deltaClass}`}>
                            <DeltaIcon className="w-3.5 h-3.5"/>
                            {faPercent(Math.abs(delta))}
                        </span>
                        <span className="text-var-color-04 dark:text-var-color-39 truncate">
                            {up ? "بیشتر" : "کمتر"} از {previousLabel}
                        </span>
                    </>
                ) : (
                    <span className={`truncate ${hintClass || "text-var-color-04 dark:text-var-color-39"}`}>
                        {hint ?? "بدونِ دادهٔ دورهٔ قبل برای مقایسه"}
                    </span>
                )}
            </div>
        </section>
    );
};

export default KpiCard;
