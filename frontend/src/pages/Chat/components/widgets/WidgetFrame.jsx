import {Link} from "react-router";
import {FiChevronLeft} from "react-icons/fi";
import {toFaDigits} from "../../../../lib/chart.js";
import {linkPath} from "./widgetFormat.js";

/**
 * قابِ مشترکِ ویجت‌ها: عنوان، زیرعنوان، و در صورتِ وجود لینکی به صفحهٔ کاملِ همان
 * داده (داشبورد، دفترِ مشتری، …).
 *
 * رنگ‌بندی‌اش همان کارت‌های پیشنهادِ صفحهٔ خالیِ گفتگوست (زمینهٔ ۰۰/۳۷ و بوردرِ
 * ۰۲/۳۸)، تا ویجت بخشی از همین صفحه دیده شود نه یک تکهٔ واردشده.
 */
const WidgetFrame = ({title, subtitle, link, children}) => {
    const to = linkPath(link);
    return (
        <section className="animate-fade-up rounded-2xl overflow-hidden
                            bg-var-color-00 dark:bg-var-color-37
                            border border-var-color-02 dark:border-var-color-38">
            {/* بی‌عنوان هم ممکن است: رابطی که مدل می‌سازد گاهی جدولی را بیرونِ
                Card می‌گذارد، و قاب بدونِ سرتیترِ خالی دورش کشیده می‌شود */}
            {(title || subtitle || to) && <header className="flex flex-row items-center gap-2 px-3.5 pt-3 pb-2.5">
                <div className="min-w-0">
                    <h3 className="m-0 text-[13px] font-IRANSansXFaNumMedium truncate
                                   text-var-color-06 dark:text-var-color-01">
                        {toFaDigits(title ?? "")}
                    </h3>
                    {subtitle && (
                        // شماره تماس هم اینجا می‌نشیند؛ `dir=auto` ترتیبِ ارقامش را
                        // در جملهٔ راست‌به‌چپ حفظ می‌کند
                        <p dir="auto" className="m-0 mt-0.5 text-[11px] text-var-color-04 dark:text-var-color-39">
                            {toFaDigits(subtitle)}
                        </p>
                    )}
                </div>
                {/* در RTL `mr-auto` لینک را به انتهای خط (چپ) می‌برد */}
                {to && (
                    <Link to={to}
                          className="mr-auto shrink-0 inline-flex flex-row items-center gap-0.5 text-[11.5px]
                                     text-var-color-19 dark:text-var-color-15
                                     hover:underline underline-offset-4">
                        {link.label}
                        <FiChevronLeft className="w-3.5 h-3.5"/>
                    </Link>
                )}
            </header>}
            {children}
        </section>
    );
};

export default WidgetFrame;
