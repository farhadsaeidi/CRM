import {useCallback, useEffect, useRef, useState} from "react";
import {useSearchParams} from "react-router";
import {FiChevronUp, FiFilter, FiPlus, FiRefreshCw} from "react-icons/fi";
import {HiOutlineUsers} from "react-icons/hi";
import {HiOutlineArrowsRightLeft, HiOutlinePencilSquare, HiOutlineTrash} from "react-icons/hi2";
import {TbMoodNeutral} from "react-icons/tb";
import {FaHandshakeSimple} from "react-icons/fa6";
import {BsGraphDownArrow, BsGraphUpArrow} from "react-icons/bs";
import {customersApi} from "../../../api/customers.js";
import {NEW_CUSTOMER_EVENT} from "../../../components/common/Header.jsx";
import CustomTooltip from "../../../components/common/CustomTooltip.jsx";
import MenuItem from "../../../components/common/MenuItem.jsx";
import Pagination from "../../../components/common/Pagination.jsx";
import ScrollContainer from "../../../components/common/ScrollContainer.jsx";
import CustomerModal from "./CustomerModal.jsx";
import {notify} from "../../../lib/notify.jsx";

// آیتم‌های منوی فیلتر — همان چهار گزینهٔ پروژهٔ CustomerManagement
const FILTER_ITEMS = [
    {id: "customersItem", key: "all", icon: HiOutlineUsers, text: "همه مشتریان", button: "فیلترها"},
    {id: "deptorsItem", key: "debt", icon: BsGraphDownArrow, text: "بدهکاران", button: "بدهکاران"},
    {id: "creditorsItem", key: "credit", icon: BsGraphUpArrow, text: "بستانکاران", button: "بستانکاران"},
    {id: "handshakeItem", key: "zero", icon: FaHandshakeSimple, text: "تسویه حساب کامل", button: "تسویه شده"},
];

// شکلِ برچسبِ وضعیت — سبز برای بستانکار، صورتی برای بدهکار و کهربایی برای بی‌حساب.
// همین سه رنگ در برچسبِ ماندهٔ فوترِ جدول تراکنش‌ها هم به کار می‌روند.
const STATUS_CLASSES = {
    "1": "text-var-color-31 bg-var-color-47 border-var-color-47",
    "-1": "text-var-color-55 bg-var-color-56 border-var-color-56",
    "0": "text-var-color-53 bg-var-color-54 border-var-color-54",
};

const formatCreatedDate = (iso) =>
    iso ? new Intl.DateTimeFormat("fa-IR", {year: "numeric", month: "2-digit", day: "2-digit"})
        .format(new Date(iso)) : "—";

const CustomersTable = () => {
    // یوآرال منبعِ حقیقت است: رفرش و دکمهٔ back درست کار می‌کنند و جستجوی فوتر
    // هم از همین راه اثر می‌گذارد
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("query") || "";
    const filter = searchParams.get("filter") || "all";
    const page = Number(searchParams.get("page") || 1);

    const [data, setData] = useState({count: 0, results: []});
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [filterMenuPos, setFilterMenuPos] = useState(null);
    const [showCustomTooltip, setShowCustomTooltip] = useState(true);

    const filterBtnRef = useRef(null);
    const filterMenuRef = useRef(null);
    const refreshBtnRef = useRef(null);
    const addBtnRef = useRef(null);

    // تولتیپِ دکمه‌های نوارِ بالای جدول شناور است، نه شبه‌عنصر — کارت
    // overflow-hidden دارد و بخشِ بیرون‌زدهٔ تولتیپِ معمولی را می‌بُرد
    const [tooltip, setTooltip] = useState({text: "", pos: null, visible: false});
    const showTooltip = (ref, text) => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) setTooltip({text, pos: {top: rect.top, left: rect.left + rect.width / 2}, visible: true});
    };
    const hideTooltip = () => setTooltip((t) => ({...t, visible: false}));

    const pageSize = 5; // برابر با CustomerPagination.page_size در بک‌اند
    const totalPages = Math.max(1, Math.ceil(data.count / pageSize));
    const activeFilter = FILTER_ITEMS.find((item) => item.key === filter) ?? FILTER_ITEMS[0];

    // setLoading(true) عمداً داخل بدنهٔ افکت نیست — قاعدهٔ set-state-in-effect
    useEffect(() => {
        let ignore = false;
        customersApi.list({query, filter, page})
            .then((res) => {
                if (ignore) return;
                setData({count: res.count ?? 0, results: res.results ?? []});
                setLoading(false);
            })
            .catch(() => {
                if (ignore) return;
                notify("دریافت فهرست مشتریان ناموفق بود.", "error");
                setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, [query, filter, page, refreshKey]);

    const setParam = useCallback((changes) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            for (const [key, value] of Object.entries(changes)) {
                // «صفحهٔ ۱» پیش‌فرض است و در یوآرال نمی‌نشیند — ولی این قاعده فقط
                // مالِ page است: شناسهٔ مشتریِ ۱ هم عدد ۱ است و نباید حذف شود
                const isDefault = value === null || value === "" || value === "all" || (key === "page" && Number(value) === 1);
                if (isDefault) next.delete(key);
                else next.set(key, String(value));
            }
            return next;
        });
    }, [setSearchParams]);

    // دکمهٔ «ثبت مشتری جدید» در هدر است و با رویدادِ سراسری خبر می‌دهد.
    // این کامپوننت در نمای چت هم mount می‌ماند (فقط hidden می‌شود)، پس شنونده
    // زنده است و رویداد گم نمی‌شود؛ پوستهٔ صفحه هم‌زمان نما را به داشبورد برمی‌گرداند.
    useEffect(() => {
        const onNew = () => setModal({mode: "create", customer: null});
        window.addEventListener(NEW_CUSTOMER_EVENT, onNew);
        return () => window.removeEventListener(NEW_CUSTOMER_EVENT, onNew);
    }, []);

    // بستنِ منوی فیلتر با کلیک بیرون
    useEffect(() => {
        const onDocClick = (e) => {
            if (filterBtnRef.current?.contains(e.target) || filterMenuRef.current?.contains(e.target)) return;
            setIsFilterMenuOpen(false);
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);

    // موقعیتِ منو زیر دکمه‌اش محاسبه می‌شود. خواندن ref حین رندر ممنوع است
    // (قاعدهٔ react-hooks/refs)، پس مقدار در state می‌نشیند و در افکت پر می‌شود.
    const positionFilterMenu = useCallback(() => {
        const rect = filterBtnRef.current?.getBoundingClientRect();
        if (rect) setFilterMenuPos({top: rect.bottom + 8, right: window.innerWidth - rect.right});
    }, []);

    useEffect(() => {
        if (!isFilterMenuOpen) return;
        const frame = requestAnimationFrame(positionFilterMenu);
        window.addEventListener("resize", positionFilterMenu);
        window.addEventListener("scroll", positionFilterMenu, true);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", positionFilterMenu);
            window.removeEventListener("scroll", positionFilterMenu, true);
        };
    }, [isFilterMenuOpen, positionFilterMenu]);

    const onModalDone = (mode) => {
        setModal(null);
        // بعد از حذفِ تنها ردیفِ یک صفحه، آن صفحه دیگر وجود ندارد
        if (mode === "delete" && data.results.length === 1 && page > 1) setParam({page: page - 1});
        else setRefreshKey((k) => k + 1);
    };

    const actionBtn = "cursor-pointer transition-all duration-200 ease-in-out";

    return (
        <>
            {/* بدون سایه — پنل‌ها فقط با رنگ و بوردر از هم جدا می‌شوند؛ سایه
                در این پروژه فقط برای مودال‌ها عمدی است */}
            <section className="w-full rounded-xl border border-var-color-57 dark:border-var-color-38 overflow-hidden flex flex-col max-h-full">
                {/* هدر جدول */}
                <header className="shrink-0 w-full bg-var-color-00 dark:bg-var-color-43 border-b border-var-color-57 dark:border-var-color-38">
                    <div className="relative flex flex-row justify-between items-center py-2 pl-3.5 pr-28.5">
                        <div/>
                        {/* عنوان جدول */}
                        <div className="absolute left-1/2 -translate-x-1/2 text-ellipsis font-MorabbaMedium dark:font-MorabbaLight text-[25px] text-var-color-08 dark:text-var-color-02 tracking-wide whitespace-nowrap">
                            جدول مشتریان
                        </div>
                        {/* دکمه‌های فیلتر، بازنشانی و ثبت */}
                        <div className="flex flex-row justify-between items-center gap-3">
                            <button
                                type="button"
                                ref={filterBtnRef}
                                onClick={() => {
                                    setIsFilterMenuOpen((v) => !v);
                                    hideTooltip();
                                }}
                                onMouseEnter={() => !isFilterMenuOpen && showTooltip(filterBtnRef, "فیلترها")}
                                onMouseLeave={hideTooltip}
                                // روی زمینهٔ فیروزه‌ای، متن و آیکونِ تیره کنتراست بیشتری
                                // از سفید دارد — همان قاعده‌ای که برای شمارهٔ صفحهٔ فعال هم به کار رفت
                                className={`w-auto h-7 rounded-full btn justify-between! btn-bluish pl-1 pr-2 font-IRANSansXFaNumRegular ${
                                    isFilterMenuOpen ? "bg-var-color-15! text-var-color-11! border-var-color-15!" : ""
                                }`}
                            >
                                <FiFilter className="w-4.5 h-4.5"/>
                                <span className="mr-1.5 ml-2.5 font-IRANSansXFaNumUltraLight!">{activeFilter.button}</span>
                                <FiChevronUp className={`inline-block w-4.5 h-4.5 transition-transform duration-200 ease-in-out ${isFilterMenuOpen ? "rotate-0" : "rotate-180"}`}/>
                            </button>

                            {/* «بازنشانی» یعنی جدول به حالتِ اولیه برگردد، نه صرفاً واکشیِ
                                دوباره — همان کاری که CustomerManagement می‌کند: جستجو،
                                فیلتر و شمارهٔ صفحه پاک می‌شوند. کادرِ جستجوی فوتر هم خودش
                                خالی می‌شود، چون از `?query=` در یوآرال می‌خواند. */}
                            <button type="button" ref={refreshBtnRef}
                                    onClick={() => {
                                        setParam({query: null, filter: null, page: null});
                                        setRefreshKey((k) => k + 1);
                                    }}
                                    onMouseEnter={() => showTooltip(refreshBtnRef, "بازنشانی جدول")}
                                    onMouseLeave={hideTooltip}
                                    className="rounded-full btn btn-bluish">
                                <div className="w-7 h-7 flex justify-center items-center">
                                    <FiRefreshCw className="w-4 h-4"/>
                                </div>
                            </button>

                            <button type="button" ref={addBtnRef}
                                    onClick={() => setModal({mode: "create", customer: null})}
                                    onMouseEnter={() => showTooltip(addBtnRef, "ثبت مشتری")}
                                    onMouseLeave={hideTooltip}
                                    className="rounded-full btn btn-bluish">
                                <div className="w-7 h-7 flex justify-center items-center">
                                    <FiPlus className="w-5 h-5"/>
                                </div>
                            </button>
                        </div>
                    </div>
                </header>

                {/* بدنهٔ جدول — در نمای باریک اسکرول افقی هم لازم است، پس هیچ
                    محورش hidden نمی‌شود */}
                <ScrollContainer className="flex-1 min-h-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="w-full">
                            <tr className="w-full grid grid-customer items-center bg-var-color-59 dark:bg-var-color-52 text-sm text-var-color-60 dark:text-var-color-51 border-b border-var-color-57 dark:border-var-color-38 font-IRANSansXFaNumLight px-4 py-3">
                                <th className="px-2 text-right">نام و نام خانوادگی</th>
                                <th className="px-2 text-center">شماره تماس</th>
                                <th className="px-2 text-center">تاریخ ایجاد</th>
                                <th className="px-2 text-center">وضعیت</th>
                                <th className="px-2 text-center">عملیات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-var-color-58 dark:bg-var-color-37 text-[15px] text-var-color-06 dark:text-var-color-46 font-IRANSansXFaNumLight">
                            {loading ? (
                                <tr className="w-full">
                                    <th className="block text-var-color-06 dark:text-var-color-39 text-center p-4 font-IRANSansXFaNumLight">
                                        در حال بارگذاری ...
                                    </th>
                                </tr>
                            ) : data.results.length === 0 ? (
                                <tr className="w-full">
                                    <th className="block text-var-color-06 dark:text-var-color-39 text-center p-4 font-IRANSansXFaNumLight">
                                        محتوایی برای نمایش وجود ندارد!
                                        <TbMoodNeutral className="w-5.75 h-5.75 text-var-color-53 inline-block mr-2"/>
                                    </th>
                                </tr>
                            ) : (
                                data.results.map((customer, index) => {
                                    const isLastItem = index === data.results.length - 1;
                                    return (
                                        <tr
                                            key={customer.id}
                                            tabIndex={-1}
                                            onDoubleClick={() => setModal({mode: "edit", customer})}
                                            className={`w-full grid grid-customer items-center hover:bg-var-color-59 dark:hover:bg-var-color-52 p-4 ${
                                                !isLastItem ? "border-b border-var-color-57 dark:border-var-color-38" : ""
                                            }`}
                                        >
                                            <th className="px-2 text-right whitespace-nowrap overflow-hidden text-ellipsis">{customer.fullname}</th>
                                            <th className="px-2 text-center whitespace-nowrap font-IRANSansXFaNumUltraLight">{customer.phone}</th>
                                            <th className="px-2 text-center whitespace-nowrap font-IRANSansXFaNumUltraLight">{formatCreatedDate(customer.created)}</th>
                                            <th className="px-2 flex justify-center items-center">
                                                <span className={`w-19 py-0.5 text-[13px] text-center border rounded-full ${STATUS_CLASSES[String(customer.code)]}`}>
                                                    {customer.status}
                                                </span>
                                            </th>
                                            <th className="px-2 flex justify-center items-center gap-3">
                                                {/* هر سه آیکون از یک خانواده‌اند (Heroicons outline) تا کنار هم
                                                    یکدست دیده شوند؛ ضخامت و گردیِ خطوطشان یکی است. */}
                                                <button type="button"
                                                        data-tooltip={showCustomTooltip ? "تراکنش های مالی" : undefined}
                                                        onClick={() => setParam({customer: customer.id})}
                                                        onMouseLeave={() => setShowCustomTooltip(true)}
                                                        className={`${actionBtn} hover:text-var-color-15 ${showCustomTooltip ? "custom-tooltip" : ""}`}>
                                                    <HiOutlineArrowsRightLeft className="w-5 h-5"/>
                                                </button>
                                                <button type="button"
                                                        data-tooltip={showCustomTooltip ? "ویرایش" : undefined}
                                                        onClick={() => setModal({mode: "edit", customer})}
                                                        onMouseLeave={() => setShowCustomTooltip(true)}
                                                        className={`${actionBtn} hover:text-var-color-53 ${showCustomTooltip ? "custom-tooltip" : ""}`}>
                                                    <HiOutlinePencilSquare className="w-5 h-5"/>
                                                </button>
                                                <button type="button"
                                                        data-tooltip={showCustomTooltip ? "حذف" : undefined}
                                                        onClick={() => setModal({mode: "delete", customer})}
                                                        onMouseLeave={() => setShowCustomTooltip(true)}
                                                        className={`${actionBtn} hover:text-var-color-28 ${showCustomTooltip ? "custom-tooltip" : ""}`}>
                                                    <HiOutlineTrash className="w-5 h-5"/>
                                                </button>
                                            </th>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </ScrollContainer>

                {/* صفحه‌بندی */}
                {!loading && data.results.length > 0 && (
                    <div className="shrink-0">
                        <Pagination page={page} totalPages={totalPages} onPageClick={(next) => setParam({page: next})}/>
                    </div>
                )}
            </section>

            {/* منوی فیلتر مشتریان — بیرونِ کارت رندر می‌شود تا overflow-hidden آن نبُرَدش */}
            <div
                ref={filterMenuRef}
                className={`fixed w-48 p-2.5 rounded-xl bg-var-color-00 dark:bg-var-color-43 border border-var-color-02 dark:border-var-color-38 shadow-md dark:shadow-lg z-50 origin-top transition duration-200 ease-[cubic-bezier(0.68,-0.6,0.32,1.25)] ${
                    isFilterMenuOpen ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-0 pointer-events-none"
                }`}
                style={{top: filterMenuPos?.top ?? -9999, right: filterMenuPos?.right ?? 16}}
            >
                {FILTER_ITEMS.map((item) => (
                    <MenuItem
                        key={item.id}
                        id={item.id}
                        icon={item.icon}
                        text={item.text}
                        toggle="customersFilter"
                        active={item.key === filter}
                        onClick={() => {
                            setParam({filter: item.key, page: 1});
                            setIsFilterMenuOpen(false);
                        }}
                    />
                ))}
            </div>

            {/* تولتیپِ شناورِ دکمه‌های نوارِ بالای جدول */}
            <CustomTooltip text={tooltip.text} pos={tooltip.pos} visible={tooltip.visible}/>

            {modal && (
                <CustomerModal
                    // key: با باز شدن روی مشتریِ دیگر فرم از نو ساخته می‌شود — بدون افکتِ ریست
                    key={`${modal.mode}-${modal.customer?.id ?? "new"}`}
                    mode={modal.mode}
                    customer={modal.customer}
                    onClose={() => setModal(null)}
                    onDone={onModalDone}
                />
            )}
        </>
    );
};

export default CustomersTable;
