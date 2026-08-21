import {useEffect, useRef, useState} from "react";
import {useLocation, useNavigate, useSearchParams} from "react-router";
import {HiOutlineSearch} from "react-icons/hi";
import {IoIosClose} from "react-icons/io";
import {FaPowerOff, FaRegUser} from "react-icons/fa6";
import {FiLock} from "react-icons/fi";
import WindowsIcon from "./WindowsIcon.jsx";
import MenuItem from "./MenuItem.jsx";
import ChangePasswordModal from "./ChangePasswordModal.jsx";
import personImage from "/images/person2.png";
import {useAuth} from "../../context/AuthContext.js";
import {authApi} from "../../api/auth.js";
import {notify} from "../../lib/notify.jsx";

const Footer = () => {
    const {user, setUser} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
    const [changePassOpen, setChangePassOpen] = useState(false);
    const [showCustomTooltip, setShowCustomTooltip] = useState(true);
    const [timeFooter, setTimeFooter] = useState("");
    const [dateFooter, setDateFooter] = useState("");
    // مقدارِ اولیه از یوآرال خوانده می‌شود تا رفرشِ صفحه جستجو را از دست ندهد
    const [searchValue, setSearchValue] = useState(() => searchParams.get("query") || "");

    const startBtnRef = useRef(null);
    const startPanelRef = useRef(null);
    const searchInputRef = useRef(null);

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

    // بستنِ منو با کلیک بیرون
    useEffect(() => {
        const onDocClick = (e) => {
            if (startBtnRef.current && !startBtnRef.current.contains(e.target) &&
                startPanelRef.current && !startPanelRef.current.contains(e.target)) {
                setIsStartMenuOpen(false);
            }
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);

    // یوآرال منبعِ حقیقتِ جستجوست؛ صفحهٔ مشتریان از همان می‌خواند
    const applySearch = (value) => {
        const params = new URLSearchParams(location.search);
        if (value.trim()) params.set("query", value.trim());
        else params.delete("query");
        // با هر جستجوی تازه باید به صفحهٔ اول برگشت، وگرنه ممکن است صفحه‌ای خالی ببینیم
        params.delete("page");
        navigate({pathname: "/customers", search: params.toString()});
    };

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
                        <div className="w-6.75 h-6.75 inline-block align-middle text-var-color-46 group-hover:text-var-color-15 group-active:scale-75 transition-transform duration-150 ease-in-out">
                            <WindowsIcon className="w-full h-full"/>
                        </div>
                    </button>

                    {/* جستجوی مشتری */}
                    <div className="relative w-52 xs:w-67 h-8.5 rounded-full bg-var-color-00 dark:bg-var-color-37 border border-var-color-48 dark:border-var-color-38 hover:bg-transparent dark:hover:bg-var-color-40 hover:border-var-color-03 dark:hover:border-transparent transition-all duration-200 ease-in-out">
                        <HiOutlineSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-var-color-15 pointer-events-none"/>
                        <input
                            type="text"
                            placeholder="جستجوی مشتری ..."
                            ref={searchInputRef}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") applySearch(searchValue);
                            }}
                            className="w-full h-full text-sm rounded-full bg-transparent text-var-color-06 dark:text-var-color-01 pr-8.25 pl-8 caret-var-color-15 focus:outline-none focus:ring-0 focus:border-var-color-15 focus:shadow-var-shadow-00 transition-all duration-200 ease-in-out input-placeholder"
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
                </section>

                {/* چپِ فوتر: ساعت و تاریخ */}
                <section className="flex flex-col justify-center items-end ml-5">
                    <div className="text-sm text-var-color-08 dark:text-var-color-01">{timeFooter}</div>
                    <div className="text-sm text-var-color-08 dark:text-var-color-01">{dateFooter}</div>
                </section>
            </footer>

            {/* پنلِ منوی حساب کاربری */}
            <section
                ref={startPanelRef}
                inert={!isStartMenuOpen}
                className={`fixed z-20 flex flex-col justify-center items-start min-w-60 mr-3 bottom-16.25 dark:bottom-16.75 rounded-xl bg-var-color-00 dark:bg-var-color-37 text-var-color-06 dark:text-var-color-46 border border-var-color-02 dark:border-var-color-38 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.35)] dark:shadow-none transition-transform duration-150 ease-[cubic-bezier(0.68,-0.6,0.32,1.25)] ${isStartMenuOpen ? "translate-y-0" : "translate-y-[110%]"}`}
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

            <ChangePasswordModal open={changePassOpen} onClose={() => setChangePassOpen(false)}/>
        </>
    );
};

export default Footer;
