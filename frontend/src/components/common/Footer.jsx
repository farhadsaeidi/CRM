import {useCallback, useEffect, useRef, useState} from "react";
import {useLocation, useNavigate, useSearchParams} from "react-router";
import {HiOutlineSearch} from "react-icons/hi";
import {IoIosClose} from "react-icons/io";
import {FaPowerOff, FaRegUser} from "react-icons/fa6";
import {FiChevronUp, FiFileText, FiHelpCircle, FiLock} from "react-icons/fi";
import {TbCoins} from "react-icons/tb";
import WindowsIcon from "./WindowsIcon.jsx";
import MenuItem from "./MenuItem.jsx";
import ChangePasswordModal from "./ChangePasswordModal.jsx";
import TransactionSearchPanel from "../../pages/Customers/components/TransactionSearchPanel.jsx";
import personImage from "/images/person2.png";
import {useAuth} from "../../context/AuthContext.js";
import {authApi} from "../../api/auth.js";
import {notify} from "../../lib/notify.jsx";

// جستجوی تاریخِ تراکنش از همین نوار اجرا می‌شود ولی نتیجه‌اش را جدولِ تراکنش‌ها
// نشان می‌دهد؛ فوتر در RootLayout است و جدول فرزندِ Outlet، پس رویدادِ سراسری
// همان راهی است که برای دکمهٔ «ثبت مشتری جدید» هدر هم به کار رفت.
// detail برابر null یعنی «جستجو پاک شد».
export const TRANSACTION_SEARCH_EVENT = "crm:transaction-search";

// هر دو کادرِ جستجوی فوتر (مشتری و تاریخ تراکنش) یک ظاهر دارند. یک‌جا تعریف
// می‌شود تا دوباره از هم واگرا نشوند.
// `has-[:focus]` ظاهرِ هاور را با فوکوسِ ورودی خنثی می‌کند: بعد از کلیک، موس هنوز
// روی کادر است و بدون این، رنگِ هاور تا پایانِ تایپ می‌ماند.
const SEARCH_BOX_CLASS =
    "relative w-52 xs:w-67 h-8.5 rounded-full transition-all duration-200 ease-in-out " +
    "bg-var-color-00 dark:bg-var-color-37 border border-var-color-48 dark:border-var-color-38 " +
    "hover:bg-transparent dark:hover:bg-var-color-40 hover:border-var-color-03 dark:hover:border-transparent " +
    "has-[:focus]:bg-var-color-00! dark:has-[:focus]:bg-var-color-37! " +
    "has-[:focus]:border-var-color-48! dark:has-[:focus]:border-var-color-38!";

// ورودیِ داخلِ کادر — هالهٔ آبی روی فوکوس، برای هر دو کادر یکی
const SEARCH_INPUT_CLASS =
    "w-full h-full text-sm rounded-full bg-transparent text-var-color-06 dark:text-var-color-01 " +
    "pr-8.25 focus:outline-none focus:ring-0 focus:border-var-color-15 focus:shadow-var-shadow-00 " +
    "transition-all duration-200 ease-in-out input-placeholder";

const Footer = () => {
    const {user, setUser} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [isDropdownMenuOpen, setIsDropdownMenuOpen] = useState(false);
    const [dropdownLeft, setDropdownLeft] = useState(0);
    const [changePassOpen, setChangePassOpen] = useState(false);
    const [showCustomTooltip, setShowCustomTooltip] = useState(true);
    const [timeFooter, setTimeFooter] = useState("");
    const [dateFooter, setDateFooter] = useState("");
    // مقدارِ اولیه از یوآرال خوانده می‌شود تا رفرشِ صفحه جستجو را از دست ندهد
    const [searchValue, setSearchValue] = useState(() => searchParams.get("query") || "");
    const [isDateSearchOpen, setIsDateSearchOpen] = useState(false);
    // پنل باید با لبهٔ راستِ همین کادرِ جستجو یک‌راستا باشد، نه با لبهٔ صفحه —
    // کادر بعد از دکمهٔ حساب کاربری می‌آید، پس فاصله‌اش از راست ثابت نیست
    const [dateSearchRight, setDateSearchRight] = useState(null);
    const dateSearchBoxRef = useRef(null);
    const dateSearchPanelRef = useRef(null);
    const dateSearchInputRef = useRef(null);

    // با باز بودنِ صفحهٔ تراکنش‌ها جستجوی نوارِ فوتر از «نام مشتری» به «تاریخ
    // تراکنش» عوض می‌شود — همان رفتار CustomerManagement. دو جا این‌طور است:
    // دفترِ یک مشتری (‎?customer=‎ در یوآرال) و جدولِ همهٔ تراکنش‌ها.
    const isTransactionsView =
        Boolean(searchParams.get("customer")) || location.pathname === "/transactions";

    // داشبورد جستجو ندارد: نه فهرستی روی صفحه هست که محدود شود و نه تاریخی که
    // جستجو شود؛ کادرِ بی‌اثر فقط کاربر را گمراه می‌کند.
    const showSearchBox = location.pathname !== "/home";

    const startBtnRef = useRef(null);
    const startPanelRef = useRef(null);
    const searchInputRef = useRef(null);
    const dropdownBtnRef = useRef(null);
    const dropdownMenuRef = useRef(null);

    // ساعت و تاریخ شمسی
    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            const parts = new Intl.DateTimeFormat("en-US", {
                hour: "2-digit", minute: "2-digit", hour12: true,
            }).formatToParts(now);
            const hour = parts.find((p) => p.type === "hour").value;
            const minute = parts.find((p) => p.type === "minute").value;
            const dayPeriod = parts.find((p) => p.type === "dayPeriod").value.toUpperCase();
            // ‎ تا در متنِ راست‌به‌چپ، ساعت وارونه خوانده نشود
            setTimeFooter(`‎${hour}:${minute} ${dayPeriod}`);
            setDateFooter(new Intl.DateTimeFormat("fa-IR", {
                year: "numeric", month: "2-digit", day: "2-digit",
            }).format(now));
        };
        updateDateTime();
        const intervalId = setInterval(updateDateTime, 1000);
        return () => clearInterval(intervalId);
    }, []);

    // اگر جستجو از جای دیگری عوض شد (مثلاً دکمهٔ پاک‌کردنِ نوارِ صفحه)، ورودی هم‌راست
    // شود. این کار با useEffect انجام نمی‌شود چون setState همگام داخل افکت رندرِ
    // آبشاری می‌سازد؛ الگوی رسمیِ ریکت برای «state مشتق از props» همین مقایسه در
    // حین رندر است. (https://react.dev/reference/react/useState#storing-information-from-previous-renders)
    const urlQuery = searchParams.get("query") || "";
    const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
    if (urlQuery !== lastUrlQuery) {
        setLastUrlQuery(urlQuery);
        setSearchValue(urlQuery);
    }

    // بستنِ منوها با کلیک بیرون
    useEffect(() => {
        const onDocClick = (e) => {
            // ⚠️ اگر خودِ عنصرِ کلیک‌شده حین اجرای هندلرش از DOM برداشته شده باشد،
            // دیگر `contains` جوابِ درست نمی‌دهد و کلیک «بیرونی» حساب می‌شود.
            // نمونه‌اش دکمهٔ ✕ِ کنارِ ردیف‌های «نامنظم»: ردیف را حذف می‌کرد، ری‌اکت
            // همان‌جا رندر می‌کرد، و بعد این شنونده کلِ پنل را می‌بست.
            if (!e.target.isConnected) return;
            if (startBtnRef.current && !startBtnRef.current.contains(e.target) &&
                startPanelRef.current && !startPanelRef.current.contains(e.target)) {
                setIsStartMenuOpen(false);
            }
            if (dropdownBtnRef.current && !dropdownBtnRef.current.contains(e.target) &&
                dropdownMenuRef.current && !dropdownMenuRef.current.contains(e.target)) {
                setIsDropdownMenuOpen(false);
            }
            // پنلِ جستجوی تاریخ هم با کلیک بیرون بسته می‌شود. منوهای انتخابِ ماه و
            // روز با پرتال بیرونِ پنل رندر می‌شوند، پس جدا استثنا می‌شوند وگرنه
            // انتخابِ یک ماه، کلِ پنل را می‌بندد.
            if (dateSearchBoxRef.current && !dateSearchBoxRef.current.contains(e.target) &&
                dateSearchPanelRef.current && !dateSearchPanelRef.current.contains(e.target) &&
                !e.target.closest?.("[data-date-search-menu]")) {
                setIsDateSearchOpen(false);
            }
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);

    // با بسته شدنِ پنل، فوکوس هم از کادر برداشته می‌شود. وگرنه اگر با کلیک روی
    // خودِ کادر بسته شود، فوکوس می‌ماند و هالهٔ آبی روشن باقی می‌ماند در حالی که
    // پنلی باز نیست.
    useEffect(() => {
        if (!isDateSearchOpen) dateSearchInputRef.current?.blur();
    }, [isDateSearchOpen]);

    // موقعیتِ پنل نسبت به لبهٔ راستِ کادرِ جستجو
    const positionDateSearch = useCallback(() => {
        const rect = dateSearchBoxRef.current?.getBoundingClientRect();
        if (rect) setDateSearchRight(window.innerWidth - rect.right);
    }, []);

    useEffect(() => {
        if (!isTransactionsView) return;
        const frame = requestAnimationFrame(positionDateSearch);
        window.addEventListener("resize", positionDateSearch);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", positionDateSearch);
        };
    }, [isTransactionsView, isDateSearchOpen, positionDateSearch]);

    // منوی دراپ‌داون زیر وسطِ دکمه‌اش بنشیند — چون فوتر ثابت است و دکمه جای متغیری
    // نسبت به لبهٔ صفحه دارد، موقعیت باید هنگام باز شدن و هر ریسایز محاسبه شود
    const positionDropdown = useCallback(() => {
        const btn = dropdownBtnRef.current;
        const menu = dropdownMenuRef.current;
        if (!btn || !menu) return;
        const btnRect = btn.getBoundingClientRect();
        setDropdownLeft(btnRect.left + btnRect.width / 2 - menu.getBoundingClientRect().width / 2);
    }, []);

    useEffect(() => {
        if (!isDropdownMenuOpen) return;
        const frame = requestAnimationFrame(positionDropdown);
        window.addEventListener("resize", positionDropdown);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", positionDropdown);
        };
    }, [isDropdownMenuOpen, positionDropdown]);

    // یوآرال منبعِ حقیقتِ جستجوست؛ صفحهٔ مشتریان از همان می‌خواند
    const applySearch = useCallback((value) => {
        const params = new URLSearchParams(location.search);
        if (value.trim()) params.set("query", value.trim());
        else params.delete("query");
        // با هر جستجوی تازه باید به صفحهٔ اول برگشت، وگرنه ممکن است صفحه‌ای خالی ببینیم
        params.delete("page");
        // در جدولِ همهٔ تراکنش‌ها همان‌جا می‌مانیم و فقط ‎?query=‎ را عوض می‌کنیم؛
        // پرتاب کردن کاربر به صفحهٔ مشتریان با تایپ در نوارِ جستجو غافلگیرکننده است
        const target = location.pathname === "/transactions" ? "/transactions" : "/customers";
        navigate({pathname: target, search: params.toString()});
    }, [location.pathname, location.search, navigate]);

    // جستجوی مشتری **زنده** است، نه با Enter — همان رفتار CustomerManagement.
    // با هر کلید درخواست نمی‌رود؛ نیم‌ثانیه بعد از آخرین کلید یک بار. خالی شدنِ
    // کادر بلافاصله اعمال می‌شود تا فهرست بی‌معطلی برگردد.
    //
    // حلقه نمی‌سازد: نتیجهٔ navigate خودش `urlQuery` را عوض می‌کند و مقایسهٔ
    // حین رندرِ بالا `searchValue` را با آن هم‌راست می‌کند، پس دفعهٔ بعد این افکت
    // در همان شرطِ اول برمی‌گردد.
    useEffect(() => {
        if (searchValue.trim() === urlQuery) return;
        if (searchValue === "") {
            applySearch("");
            return;
        }
        const timer = setTimeout(() => applySearch(searchValue), 500);
        return () => clearTimeout(timer);
    }, [searchValue, urlQuery, applySearch]);

    const cleanSearchInput = () => {
        setSearchValue("");
        applySearch("");
        searchInputRef.current?.focus();
    };

    const logOutHandler = async () => {
        try {
            const res = await authApi.logout();
            setIsStartMenuOpen(false);
            notify(res?.message || "با موفقیت خارج شدید.", "success", 1200);
            // صبر تا نوار پیشرفتِ پیغام کامل شود، بعد رفتن به صفحهٔ ورود
            await new Promise((resolve) => setTimeout(resolve, 1200));
            setUser(null);
            navigate("/auth/login", {replace: true});
        } catch (err) {
            notify(err?.data?.message || "خروج از حساب انجام نشد. لطفاً دوباره تلاش کنید...", "error");
        }
    };

    // آیتم‌های منوی دراپ‌داون — همان سه گزینهٔ پروژهٔ CustomerManagement.
    // هنوز صفحه‌ای پشتشان نیست، پس فعلاً پیغام می‌دهند نه لینکِ مرده.
    const soon = (label) => () => {
        setIsDropdownMenuOpen(false);
        notify(`${label} به‌زودی اضافه می‌شود.`, "info");
    };

    const dropdownItems = [
        {id: "moneyItem", icon: TbCoins, text: "سرمایه در گردش شما", onClick: soon("سرمایه در گردش")},
        {id: "billItem", icon: FiFileText, text: "صورتحساب همه مشتریان", onClick: soon("صورتحساب مشتریان")},
        {id: "helpItem", icon: FiHelpCircle, text: "راهنمای نرم افزار", onClick: soon("راهنمای نرم‌افزار")},
    ];

    const menuItems = [
        {
            id: "profileItem", icon: FaRegUser, text: "پروفایل", toggle: "start",
            onClick: () => {
                setIsStartMenuOpen(false);
                notify("صفحه پروفایل به‌زودی اضافه می‌شود.", "info");
            },
        },
        {
            id: "lockItem", icon: FiLock, text: "تغییر رمز عبور", toggle: "start",
            onClick: () => {
                setIsStartMenuOpen(false);
                setChangePassOpen(true);
            },
        },
    ];

    return (
        <>
            <footer className="fixed left-0 right-0 bottom-0 h-(--footer-height) bg-var-color-00 dark:bg-var-color-36 z-10 flex justify-between items-center border-t border-t-var-color-02 dark:border-t-var-color-38">
                {/* راستِ فوتر: دکمهٔ حساب و جستجو */}
                <section className="flex justify-start items-center gap-1.75 mr-3">
                    <button
                        type="button"
                        aria-label="حساب کاربری"
                        aria-expanded={isStartMenuOpen}
                        ref={startBtnRef}
                        data-tooltip={showCustomTooltip ? "حساب کاربری" : undefined}
                        onClick={() => {
                            setIsStartMenuOpen((v) => !v);
                            setShowCustomTooltip(false);
                        }}
                        onMouseLeave={() => setShowCustomTooltip(true)}
                        className={`p-2 rounded-md cursor-pointer transition-all duration-200 ease-in-out border ${isStartMenuOpen ? "bg-var-color-01 dark:bg-var-color-40 border-var-color-02 dark:border-var-color-41" : "bg-transparent border-transparent"} hover:bg-var-color-01 dark:hover:bg-var-color-40 hover:border-var-color-02 dark:hover:border-var-color-41 ${showCustomTooltip ? "custom-tooltip" : ""} group`}
                    >
                        {/* var-color-46 خاکستریِ روشن است و روی زمینهٔ سفیدِ تم لایت گم می‌شود */}
                        <div className="w-6.75 h-6.75 inline-block align-middle text-var-color-05 dark:text-var-color-46 group-hover:text-var-color-15 dark:group-hover:text-var-color-15 group-active:scale-75 transition-transform duration-150 ease-in-out">
                            <WindowsIcon className="w-full h-full"/>
                        </div>
                    </button>

                    {/* جستجوی تاریخ تراکنش — فقط در صفحهٔ تراکنش‌ها */}
                    {!showSearchBox ? null : isTransactionsView ? (
                        <div ref={dateSearchBoxRef} className={SEARCH_BOX_CLASS}>
                            <HiOutlineSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-var-color-15 pointer-events-none"/>
                            {/* readOnly است چون خودش ورودی نمی‌گیرد؛ فقط پنل را باز می‌کند */}
                            <input
                                readOnly
                                type="text"
                                ref={dateSearchInputRef}
                                placeholder="جستجوی تاریخ تراکنش های مالی ..."
                                onClick={() => setIsDateSearchOpen((v) => !v)}
                                className={`${SEARCH_INPUT_CLASS} pl-3 cursor-pointer caret-transparent`}
                            />
                        </div>
                    ) : (
                    /* جستجوی مشتری */
                    <div className={SEARCH_BOX_CLASS}>
                        <HiOutlineSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-var-color-15 pointer-events-none"/>
                        <input
                            type="text"
                            placeholder="جستجوی نام یا شماره تماس مشتری ..."
                            ref={searchInputRef}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") applySearch(searchValue);
                            }}
                            className={`${SEARCH_INPUT_CLASS} pl-8 caret-var-color-15`}
                        />
                        <button
                            type="button"
                            aria-label="پاک کردن جستجو"
                            onClick={cleanSearchInput}
                            className={`absolute left-1.75 top-1/2 -translate-y-1/2 w-6 h-6 pr-px rounded-full border-none bg-transparent text-var-color-04 dark:text-var-color-39 items-center justify-center text-xl cursor-pointer transition-all duration-200 ease-in-out hover:bg-var-color-02 dark:hover:bg-var-color-44 hover:text-var-color-06 dark:hover:text-var-color-15 ${searchValue ? "flex" : "hidden"}`}
                        >
                            <IoIosClose/>
                        </button>
                    </div>
                    )}
                </section>

                {/* چپِ فوتر: دکمهٔ دراپ‌داون، ساعت و تاریخ */}
                <section className="flex flex-row justify-end items-center gap-4.5">
                    <button
                        type="button"
                        ref={dropdownBtnRef}
                        aria-label="منوی گزارش‌ها"
                        aria-expanded={isDropdownMenuOpen}
                        onClick={() => setIsDropdownMenuOpen((v) => !v)}
                        // var-color-40/41 سرمه‌ای تیره‌اند و فقط برای تم دارک؛ بدون
                        // پیشوند dark: در تم لایت هم اعمال می‌شدند و دکمه سیاه می‌شد.
                        // همان جفت‌رنگی که دکمهٔ حساب کاربری استفاده می‌کند.
                        className={`flex justify-center items-center py-2.5 px-1.25 rounded-md cursor-pointer transition-all duration-200 ease-in-out border ${
                            isDropdownMenuOpen
                                ? "bg-var-color-01 dark:bg-var-color-40 border-var-color-02 dark:border-var-color-41"
                                : "bg-transparent border-transparent"
                        } hover:bg-var-color-01 dark:hover:bg-var-color-40 hover:border-var-color-02 dark:hover:border-var-color-41`}
                    >
                        <FiChevronUp className={`inline-block text-var-color-08 dark:text-var-color-01 w-5.5 h-5.5 transition-transform duration-200 ease-in-out ${
                            isDropdownMenuOpen ? "rotate-180" : ""
                        }`}/>
                    </button>

                    <div className="flex flex-col justify-center items-end ml-5">
                        <div className="text-sm text-var-color-08 dark:text-var-color-01">{timeFooter}</div>
                        <div className="text-sm text-var-color-08 dark:text-var-color-01">{dateFooter}</div>
                    </div>
                </section>
            </footer>

            {/* منوی دکمهٔ دراپ‌داون */}
            <section
                ref={dropdownMenuRef}
                inert={!isDropdownMenuOpen}
                style={{left: `${dropdownLeft}px`}}
                className={`fixed z-[5] flex flex-col justify-center items-start min-w-56 p-2.5 bottom-[calc(var(--footer-height)+0.5rem)] rounded-xl bg-var-color-00 dark:bg-var-color-37 text-var-color-06 dark:text-var-color-46 border border-var-color-02 dark:border-var-color-38 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.35)] dark:shadow-none transition-transform duration-250 ease-[cubic-bezier(0.68,-0.6,0.32,1.25)] ${
                    isDropdownMenuOpen ? "translate-y-0" : "translate-y-[110%]"
                }`}
            >
                {dropdownItems.map((item) => (
                    <MenuItem key={item.id} id={item.id} icon={item.icon} text={item.text}
                              toggle="dropdown" onClick={item.onClick}/>
                ))}
            </section>

            {/* پنلِ منوی حساب کاربری */}
            <section
                ref={startPanelRef}
                inert={!isStartMenuOpen}
                className={`fixed z-[5] flex flex-col justify-center items-start min-w-60 mr-3 bottom-[calc(var(--footer-height)+0.5rem)] rounded-xl bg-var-color-00 dark:bg-var-color-37 text-var-color-06 dark:text-var-color-46 border border-var-color-02 dark:border-var-color-38 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.35)] dark:shadow-none transition-transform duration-150 ease-[cubic-bezier(0.68,-0.6,0.32,1.25)] ${isStartMenuOpen ? "translate-y-0" : "translate-y-[110%]"}`}
            >
                <div className="w-full p-2.5">
                    {menuItems.map((item) => (
                        <MenuItem key={item.id} id={item.id} icon={item.icon} text={item.text}
                                  toggle={item.toggle} onClick={item.onClick}/>
                    ))}
                </div>
                <footer className="w-full flex flex-row justify-between items-center p-2 rounded-b-[10px] bg-var-color-01 dark:bg-var-color-36 border-t border-t-var-color-02 dark:border-t-transparent mt-6 gap-8">
                    <div className="flex flex-row justify-start items-center gap-2 min-w-0">
                        <div className="w-8 h-8 shrink-0 rounded-full bg-center bg-no-repeat bg-cover ring-1 ring-var-color-02 dark:ring-transparent"
                             style={{backgroundImage: `url(${personImage})`}}/>
                        <span className="text-[15px] truncate">{user?.fullname}</span>
                    </div>
                    <button
                        type="button"
                        aria-label="خروج از حساب"
                        data-tooltip={showCustomTooltip ? "خروج" : undefined}
                        onClick={logOutHandler}
                        className="shrink-0 flex justify-center items-center w-8 h-8 border border-transparent rounded-md text-var-color-05 dark:text-var-color-46 hover:border-var-color-45 hover:bg-var-color-26 hover:text-var-color-28 dark:hover:text-var-color-28 transition-all duration-200 ease-in-out cursor-pointer custom-tooltip"
                    >
                        <FaPowerOff className="w-4.5 h-4.5"/>
                    </button>
                </footer>
            </section>

            {/* پنل جستجوی تاریخ تراکنش — فقط وقتی صفحهٔ تراکنش‌ها باز است mount می‌شود
                تا state داخلی‌اش با هر بار برگشتن به آن صفحه از نو ساخته شود */}
            {isTransactionsView && (
                <TransactionSearchPanel
                    panelRef={dateSearchPanelRef}
                    right={dateSearchRight}
                    open={isDateSearchOpen}
                    onClose={() => setIsDateSearchOpen(false)}
                    onSearch={(payload) => {
                        window.dispatchEvent(new CustomEvent(TRANSACTION_SEARCH_EVENT, {detail: payload}));
                        setIsDateSearchOpen(false);
                        if (!payload) notify("هیچ شرطی برای جستجو انتخاب نشده — همهٔ تراکنش‌ها نمایش داده می‌شود.", "info");
                    }}
                />
            )}

            <ChangePasswordModal open={changePassOpen} onClose={() => setChangePassOpen(false)}/>
        </>
    );
};

export default Footer;
