import {useEffect, useState} from "react";
import {FiChevronLeft, FiChevronRight, FiHelpCircle, FiMoon, FiSearch, FiUserPlus} from "react-icons/fi";
import {HiOutlineArrowsRightLeft, HiOutlineBanknotes} from "react-icons/hi2";
import {BsGraphDownArrow} from "react-icons/bs";
import {FiGrid} from "react-icons/fi";
import ModalCloseButton from "./ModalCloseButton.jsx";
import ScrollContainer from "./ScrollContainer.jsx";

/**
 * راهنمای نرم‌افزار — یک بازدیدِ گام‌به‌گام از خودِ کار، نه فهرستِ قابلیت‌ها.
 *
 * چرا مرحله‌ای و نه یک متنِ بلند؟ چون کاری که مالک انجام می‌دهد خودش یک ترتیب
 * دارد: اول مشتری ثبت می‌کند، بعد برایش نسیه/پرداخت می‌زند، بعد نتیجه را در
 * داشبورد می‌بیند. شماره‌ها اینجا تزئین نیستند؛ همان ترتیبِ واقعیِ کارند.
 */
const STEPS = [
    {
        icon: FiUserPlus,
        title: "مشتری را ثبت کنید",
        lead: "هر چیزِ دیگری از اینجا شروع می‌شود.",
        body: [
            "دکمهٔ «ثبت مشتری جدید» در نوارِ بالا از هر صفحه‌ای در دسترس است و شما را از صفحه‌ای که هستید بیرون نمی‌برد.",
            "فقط نام و شمارهٔ همراه لازم است. شماره در دفترِ شما یکتاست، ولی همان شخص می‌تواند مشتریِ فروشندهٔ دیگری هم باشد — دفترها کاملاً از هم جدا هستند.",
        ],
        tip: "دکمهٔ + بالای جدول مشتریان هم همین کار را می‌کند.",
    },
    {
        icon: HiOutlineArrowsRightLeft,
        title: "نسیه و پرداختی را بزنید",
        lead: "دفترِ هر مشتری، درست مثل دفترِ کاغذی.",
        body: [
            "در جدول مشتریان، آیکونِ فلش‌های دوطرفه دفترِ همان مشتری را باز می‌کند.",
            "هر تراکنش یا نسیه است یا پرداختی — همان چیزی که در دفتر می‌نویسید. ثبتِ تراکنشی که هر دو مبلغش صفر باشد پذیرفته نمی‌شود.",
            "مبلغ را که می‌نویسید، زیرِ کادر به حروف هم نشان داده می‌شود تا صفرِ اضافه به چشم بیاید.",
        ],
        tip: "با هر ثبت، ویرایش یا حذف، مانده و وضعیت حساب بی‌درنگ دوباره حساب می‌شود.",
    },
    {
        icon: HiOutlineBanknotes,
        title: "مانده را بخوانید",
        lead: "سه وضعیت، و هیچ‌کدام حدسی نیست.",
        body: [
            "«بدهکار» یعنی نسیه‌اش بیشتر از پرداختی‌اش است و از شما طلبکارید. «بستانکار» یعنی بیشتر از بدهی‌اش پرداخته. «بی‌حساب» یعنی صفر شده‌اند.",
            "ماندهٔ بالای دفتر همیشه روی کلِ حساب است، حتی وقتی فیلترِ دوره را روی «این ماه» گذاشته‌اید — چون ماندهٔ نصفه‌کاره هیچ معنایی ندارد.",
        ],
        tip: "رنگ‌ها همه‌جای برنامه یکی‌اند: صورتی بدهکار، سبز بستانکار، کهربایی بی‌حساب.",
    },
    {
        icon: FiSearch,
        title: "پیدا کنید",
        lead: "دو جستجو، بسته به اینکه کجا هستید.",
        body: [
            "کادرِ جستجوی نوارِ پایین در صفحهٔ مشتریان دنبالِ نام و شمارهٔ تماس می‌گردد و همان‌طور که تایپ می‌کنید نتیجه را کم می‌کند.",
            "در دفترِ یک مشتری و در جدولِ همهٔ تراکنش‌ها، همان کادر به «جستجوی تاریخ» تبدیل می‌شود: سال، ماه و روز را جدا انتخاب می‌کنید و با هم ترکیب می‌شوند.",
            "در ماه و روز می‌توانید بازهٔ چرخشی بدهید — «۱۱ تا ۲» یعنی بهمن تا اردیبهشت، نه «هیچ».",
        ],
        tip: "فیلترِ دوره و جستجوی تاریخ جایگزین یکدیگرند؛ با انتخابِ یکی، دیگری برداشته می‌شود.",
    },
    {
        icon: FiGrid,
        title: "داشبورد را ببینید",
        lead: "خلاصهٔ دفتر، بدونِ اینکه چیزی را دستی جمع بزنید.",
        body: [
            "بالای صفحه چهار عدد است: ماندهٔ کل، نسیهٔ دوره، وصولیِ دوره، و نرخ وصول (چند درصدِ نسیه‌ای که داده‌اید برگشته).",
            "نمودارِ روند نشان می‌دهد نسیه و وصولی در دوازده ماه چطور رفته‌اند و ماندهٔ شما در چه مسیری است.",
            "«سررسید بدهی» طلب‌ها را بر پایهٔ اینکه چند روز از آخرین تراکنش گذشته دسته‌بندی می‌کند — هرچه قرمزتر، وصولش سخت‌تر.",
        ],
        tip: "دورهٔ بالای داشبورد فقط روی جریان‌ها اثر دارد؛ ماندهٔ کل همیشه کلِ دفتر است.",
    },
    {
        icon: FiMoon,
        title: "پیگیری کنید",
        lead: "بخشی که کارِ فردا را می‌گوید.",
        body: [
            "«بدهکارترین مشتریان» و «سررسید بدهی» می‌گویند سراغِ چه کسی بروید.",
            "«مشتریان راکد» کسانی‌اند که مدتی است خبری ازشان نیست، به‌علاوهٔ آن‌هایی که ثبت شده‌اند ولی هنوز معامله‌ای نکرده‌اند — این دو گروه پیگیریِ متفاوتی می‌خواهند.",
            "«خوش‌حساب‌ترین‌ها» عکسِ همان است: کسانی که نسیه گرفته‌اند و پس داده‌اند. سه نفرِ اول مدال می‌گیرند.",
        ],
        tip: "روی هر ردیفِ این فهرست‌ها کلیک کنید تا مستقیم به دفترِ همان مشتری بروید.",
    },
];

const GuideModal = ({open, onClose}) => {
    const [step, setStep] = useState(0);
    const [isClosing, setIsClosing] = useState(false);

    // با هر بار باز شدن از گامِ اول شروع شود. «state مشتق از props» با مقایسه در
    // حین رندر انجام می‌شود نه با افکت — قاعدهٔ set-state-in-effect.
    const [wasOpen, setWasOpen] = useState(open);
    if (wasOpen !== open) {
        setWasOpen(open);
        if (open) {
            setStep(0);
            setIsClosing(false);
        }
    }

    const requestClose = () => setIsClosing(true);
    const handleAnimationEnd = () => {
        if (isClosing) onClose();
    };

    // کلیدهای جهت‌دار بین گام‌ها می‌برند و Esc می‌بندد
    useEffect(() => {
        if (!open) return;
        const onKey = (event) => {
            if (event.key === "Escape") requestClose();
            // در RTL جهتِ «جلو» چپ است
            if (event.key === "ArrowLeft") setStep((s) => Math.min(s + 1, STEPS.length - 1));
            if (event.key === "ArrowRight") setStep((s) => Math.max(s - 1, 0));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    if (!open) return null;

    const current = STEPS[step];
    const Icon = current.icon;
    const isFirst = step === 0;
    const isLast = step === STEPS.length - 1;

    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-3
                        bg-black/50 backdrop-blur-sm dark:bg-black/40 dark:backdrop-blur-lg"
             onClick={requestClose} role="dialog" aria-modal="true" aria-label="راهنمای نرم‌افزار">
            <section
                onClick={(e) => e.stopPropagation()}
                onAnimationEnd={handleAnimationEnd}
                className={`relative w-full max-w-125 max-h-[calc(100vh-1.5rem)] rounded-[18px] p-4 2xs:p-5
                            flex flex-col gap-4
                            bg-var-color-00 dark:bg-var-color-37
                            border border-var-color-02 dark:border-var-color-38
                            shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] ${
                    isClosing ? "animate-modal-out" : "animate-modal-in"
                }`}
            >
                <header className="shrink-0 flex items-center justify-between gap-3">
                    <div className="flex flex-row justify-start items-center gap-2 min-w-0">
                        <span className="w-7 h-7 shrink-0 flex justify-center items-center rounded-full
                                         text-var-color-01 dark:text-var-color-15
                                         bg-var-color-15 dark:bg-var-color-12
                                         border border-var-color-15 dark:border-var-color-42">
                            <FiHelpCircle className="w-3.5 h-3.5"/>
                        </span>
                        <h3 className="m-0 text-[16px] font-IRANSansXFaNumDemiBold truncate
                                       text-var-color-06 dark:text-var-color-01">راهنمای نرم‌افزار</h3>
                    </div>
                    <ModalCloseButton size="sm" onClick={requestClose}/>
                </header>

                {/* گامِ جاری. key باعث می‌شود با هر جابه‌جایی محتوا دوباره mount و
                    انیمیشنِ ورودش پخش شود — وگرنه متن بی‌صدا عوض می‌شد. */}
                <ScrollContainer key={step} className="flex-1 min-h-0 max-h-100" overflowX="hidden" trackPadding={10}>
                    <article className="animate-fade-up flex flex-col gap-3 pl-2">
                        <div className="flex flex-row items-start gap-3">
                            <span className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center
                                             bg-var-color-12 dark:bg-var-color-44 text-var-color-15
                                             border border-var-color-13 dark:border-var-color-16">
                                <Icon className="w-5 h-5"/>
                            </span>
                            <div className="min-w-0">
                                <h4 className="m-0 text-[17px] font-IRANSansXFaNumDemiBold
                                               text-var-color-06 dark:text-var-color-01">{current.title}</h4>
                                <p className="m-0 mt-0.5 text-[12.5px] text-var-color-15">{current.lead}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {current.body.map((paragraph) => (
                                <p key={paragraph}
                                   className="m-0 text-[13.5px] leading-7 text-var-color-06 dark:text-var-color-46">
                                    {paragraph}
                                </p>
                            ))}
                        </div>

                        <p className="m-0 flex flex-row items-start gap-2 rounded-xl px-3 py-2.5 text-[12.5px] leading-6
                                      bg-var-color-12 dark:bg-var-color-44
                                      text-var-color-19 dark:text-var-color-14">
                            <BsGraphDownArrow className="w-3.5 h-3.5 shrink-0 mt-1.5 opacity-70"/>
                            {current.tip}
                        </p>
                    </article>
                </ScrollContainer>

                <footer className="shrink-0 flex flex-row items-center justify-between gap-3">
                    {/* نشانگرِ گام‌ها؛ خودشان هم دکمه‌اند تا بشود پرید */}
                    <div className="flex flex-row items-center gap-1.5">
                        {STEPS.map((item, index) => (
                            <button
                                key={item.title}
                                type="button"
                                aria-label={`گام ${index + 1}: ${item.title}`}
                                aria-current={index === step}
                                onClick={() => setStep(index)}
                                className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                                    index === step
                                        ? "w-6 bg-var-color-15"
                                        : "w-1.5 bg-var-color-02 dark:bg-var-color-38 hover:bg-var-color-14"
                                }`}
                            />
                        ))}
                    </div>

                    <div className="flex flex-row items-center gap-2">
                        {/* enabled: لازم است چون هاور روی دکمهٔ disabled هم اعمال می‌شود */}
                        <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => setStep((s) => s - 1)}
                            className="h-9 px-3 rounded-xl btn btn-bluish text-[13px]
                                       disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <FiChevronRight className="w-4 h-4"/>
                            قبلی
                        </button>
                        {isLast ? (
                            <button type="button" onClick={requestClose}
                                    className="h-9 px-4 rounded-xl text-[13px] cursor-pointer transition-all duration-200
                                               bg-var-color-15 text-var-color-11 hover:brightness-110 active:scale-[0.98]">
                                فهمیدم
                            </button>
                        ) : (
                            <button type="button" onClick={() => setStep((s) => s + 1)}
                                    className="h-9 px-3 rounded-xl btn btn-bluish text-[13px]">
                                بعدی
                                <FiChevronLeft className="w-4 h-4"/>
                            </button>
                        )}
                    </div>
                </footer>
            </section>
        </div>
    );
};

export default GuideModal;
