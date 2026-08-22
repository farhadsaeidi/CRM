import {useCallback, useEffect, useRef, useState} from "react";
import {useSearchParams} from "react-router";
import {FiChevronUp, FiFilter, FiPlus, FiRefreshCw} from "react-icons/fi";
import {HiOutlineArrowRight, HiOutlinePencilSquare, HiOutlineTrash} from "react-icons/hi2";
import {TbMoodNeutral} from "react-icons/tb";
import {transactionsApi} from "../../../api/transactions.js";
import {TRANSACTION_SEARCH_EVENT} from "../../../components/common/Footer.jsx";
import CustomTooltip from "../../../components/common/CustomTooltip.jsx";
import MenuItem from "../../../components/common/MenuItem.jsx";
import ScrollContainer from "../../../components/common/ScrollContainer.jsx";
import TransactionModal from "./TransactionModal.jsx";
import {formatPersianNumber} from "../../../lib/numbers.js";
import {notify} from "../../../lib/notify.jsx";

// همان پنج گزینهٔ فیلترِ دورهٔ پروژهٔ CustomerManagement
const FILTER_ITEMS = [
    {key: "all", text: "همه", button: "فیلترها"},
    {key: "today", text: "امروز", button: "امروز"},
    {key: "week", text: "هفته جاری", button: "هفته جاری"},
    {key: "month", text: "ماه جاری", button: "ماه جاری"},
    {key: "year", text: "سال جاری", button: "سال جاری"},
];

// برچسبِ وضعیت در فوترِ جدول پررنگ‌تر از ستونِ وضعیتِ جدول مشتریان است — اینجا
// یک عدد است که باید به چشم بیاید، آنجا یکی از پنج ردیف.
// بستانکار سبز است (همان سبزِ جدول مشتریان)، ولی بدهکار عمداً صورتی مانده.
const STATUS_CLASSES = {
    "1": "bg-var-color-31 text-var-color-00 dark:bg-var-color-47 dark:text-var-color-31",
    "-1": "bg-var-color-55 text-var-color-00 dark:bg-var-color-56 dark:text-var-color-55",
    "0": "bg-var-color-53 text-var-color-00 dark:bg-var-color-54 dark:text-var-color-53",
};

const EMPTY = {customer: null, transactions: [], remainder: 0};

// تاریخ از سه ستونِ شمسیِ خودِ ردیف ساخته می‌شود، نه از تبدیلِ دوبارهٔ created —
// همان مقداری دیده می‌شود که سرور برای فیلتر و جستجو به کار می‌برد
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFaDigits = (value) => String(value).replace(/\d/g, (digit) => FA_DIGITS[digit]);
const formatShamsi = ({year, month, day}) =>
    year && month && day
        ? toFaDigits(`${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`)
        : "—";

const TransactionsTable = ({customerId, onBack}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const filter = searchParams.get("tfilter") || "all";

    const [data, setData] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    // جستجوی تاریخ در یوآرال نمی‌نشیند: ساختارش تودرتوست و یوآرال را ناخوانا می‌کند.
    // با تعویضِ مشتری هم باید پاک شود، که با key در والد انجام می‌گیرد.
    const [searchPayload, setSearchPayload] = useState(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [filterMenuPos, setFilterMenuPos] = useState(null);
    const [showCustomTooltip, setShowCustomTooltip] = useState(true);

    const backBtnRef = useRef(null);
    const filterBtnRef = useRef(null);
    const filterMenuRef = useRef(null);
    const refreshBtnRef = useRef(null);
    const addBtnRef = useRef(null);

    const [tooltip, setTooltip] = useState({text: "", pos: null, visible: false});
    const showTooltip = (ref, text) => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) setTooltip({text, pos: {top: rect.top, left: rect.left + rect.width / 2}, visible: true});
    };
    const hideTooltip = () => setTooltip((t) => ({...t, visible: false}));

    const activeFilter = FILTER_ITEMS.find((item) => item.key === filter) ?? FILTER_ITEMS[0];

    const setFilter = useCallback((next) => {
        setSearchParams((prev) => {
            const params = new URLSearchParams(prev);
            if (next === "all") params.delete("tfilter");
            else params.set("tfilter", next);
            return params;
        }, {replace: true});
    }, [setSearchParams]);

    // یک افکت برای هر دو حالت (فیلترِ دوره و جستجوی تاریخ) — دو افکتِ جدا یعنی
    // دو درخواست هم‌زمان موقعی که یکی جای دیگری را می‌گیرد
    useEffect(() => {
        let ignore = false;
        const request = searchPayload
            ? transactionsApi.search(customerId, searchPayload)
            : transactionsApi.list(customerId, filter);

        request
            .then((res) => {
                if (ignore) return;
                setData({
                    customer: res.customer ?? null,
                    transactions: res.transactions ?? [],
                    remainder: res.remainder ?? 0,
                });
                setLoading(false);
            })
            .catch((err) => {
                if (ignore) return;
                notify(err?.status === 404 ? "این مشتری پیدا نشد." : "دریافت تراکنش‌ها ناموفق بود.", "error");
                setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, [customerId, filter, searchPayload, refreshKey]);

    // جستجوی تاریخ از نوارِ فوتر می‌آید. رویدادِ سراسری همان الگویی است که برای
    // دکمهٔ «ثبت مشتری جدید» هدر به کار رفت: فوتر بیرونِ درختِ صفحه است.
    useEffect(() => {
        const onSearch = (event) => {
            const payload = event.detail ?? null;
            // جستجو و فیلترِ دوره جایگزین یکدیگرند؛ سرور در endpoint جستجو
            // پارامترِ دوره نمی‌گیرد و نگه‌داشتنِ هر دو یعنی نمایشِ گمراه‌کننده
            if (payload) setFilter("all");
            setSearchPayload(payload);
        };
        window.addEventListener(TRANSACTION_SEARCH_EVENT, onSearch);
        return () => window.removeEventListener(TRANSACTION_SEARCH_EVENT, onSearch);
    }, [setFilter]);

    useEffect(() => {
        const onDocClick = (e) => {
            if (filterBtnRef.current?.contains(e.target) || filterMenuRef.current?.contains(e.target)) return;
            setIsFilterMenuOpen(false);
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);

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

    const actionBtn = "cursor-pointer transition-all duration-200 ease-in-out";
    const customer = data.customer;
    const statusCode = String(customer?.code ?? 0);

    return (
        <>
            <section className="w-full rounded-xl border border-var-color-57 dark:border-var-color-38 overflow-hidden flex flex-col max-h-full">
                {/* هدر جدول */}
                <header className="shrink-0 w-full bg-var-color-00 dark:bg-var-color-43 border-b border-var-color-57 dark:border-var-color-38">
                    <div className="relative flex flex-row justify-between items-center py-2 px-3.5">
                        {/* بازگشت و نامِ مشتری */}
                        <div className="flex flex-row justify-start items-center gap-3">
                            <button type="button" ref={backBtnRef}
                                    onClick={() => {
                                        hideTooltip();
                                        onBack();
                                    }}
                                    onMouseEnter={() => showTooltip(backBtnRef, "بازگشت به جدول مشتریان")}
                                    onMouseLeave={hideTooltip}
                                    className="rounded-full p-1 btn btn-bluish">
                                <HiOutlineArrowRight className="w-4.5 h-4.5"/>
                            </button>
                            <div className="flex justify-center items-center h-7 px-3 rounded-full cursor-default whitespace-nowrap
                                            bg-var-color-15 dark:bg-var-color-12 text-var-color-00 dark:text-var-color-15
                                            font-IRANSansXFaNumLight dark:font-IRANSansXFaNumUltraLight">
                                {customer?.fullname ?? "..."}
                            </div>
                        </div>

                        {/* عنوان جدول */}
                        <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 text-ellipsis font-MorabbaMedium dark:font-MorabbaLight text-[25px] text-var-color-08 dark:text-var-color-02 tracking-wide whitespace-nowrap">
                            جدول تراکنش های مالی مشتری
                        </div>

                        {/* فیلتر، بازنشانی و ثبت */}
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
                                // روی زمینهٔ سبز، متن و آیکونِ تیره خواناتر از سفید است
                                className={`w-auto h-7 rounded-full btn justify-between! btn-bluish pl-1 pr-2 font-IRANSansXFaNumRegular ${
                                    isFilterMenuOpen ? "bg-var-color-15! text-var-color-11! border-var-color-15!" : ""
                                }`}
                            >
                                <FiFilter className="w-4.5 h-4.5"/>
                                <span className="mr-1.5 ml-2.5 font-IRANSansXFaNumUltraLight!">{activeFilter.button}</span>
                                <FiChevronUp className={`inline-block w-4.5 h-4.5 transition-transform duration-200 ease-in-out ${isFilterMenuOpen ? "rotate-0" : "rotate-180"}`}/>
                            </button>

                            <button type="button" ref={refreshBtnRef}
                                    onClick={() => {
                                        // بازنشانی هم جستجوی تاریخ را پاک می‌کند و هم دوباره می‌خواند
                                        setSearchPayload(null);
                                        setFilter("all");
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
                                    onClick={() => setModal({mode: "create", transaction: null})}
                                    onMouseEnter={() => showTooltip(addBtnRef, "ثبت تراکنش")}
                                    onMouseLeave={hideTooltip}
                                    className="rounded-full btn btn-bluish">
                                <div className="w-7 h-7 flex justify-center items-center">
                                    <FiPlus className="w-5 h-5"/>
                                </div>
                            </button>
                        </div>
                    </div>
                </header>

                {/* بدنهٔ جدول — ارتفاعش به اندازهٔ پنج ردیف بسته است و بقیه اسکرول
                    می‌خورد؛ رنگِ اسکرول‌بار سبز است چون رنگِ این صفحه سبز است */}
                <ScrollContainer className="flex-1 min-h-0 h-transactions-5"
                                 // شفافیت بالا نگه داشته می‌شود وگرنه کنارِ آبیِ توپُرِ
                                 // دکمه‌های جدول، خاکستری‌زده دیده می‌شود
                                 opacity={0.85} hoverOpacity={1}
                                 width={4.3} maxHeight={110} autoHide="never">
                    <table className="w-full text-left border-collapse">
                        {/* سرستون داخل همان ناحیهٔ اسکرول است تا در نمای باریک از ستون‌ها جدا نیفتد */}
                        <thead className="w-full sticky top-0 z-[1]">
                            <tr className="w-full grid grid-transaction items-center bg-var-color-59 dark:bg-var-color-52 text-sm text-var-color-60 dark:text-var-color-51 border-b border-var-color-57 dark:border-var-color-38 font-IRANSansXFaNumLight px-4 py-3">
                                <th className="px-2 text-center">مبلغ نسیه (تومان)</th>
                                <th className="px-2 text-center">مبلغ پرداختی (تومان)</th>
                                <th className="px-2 text-center">تاریخ تراکنش</th>
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
                            ) : data.transactions.length === 0 ? (
                                <tr className="w-full">
                                    <th className="block text-var-color-06 dark:text-var-color-39 text-center p-4 font-IRANSansXFaNumLight">
                                        محتوایی برای نمایش وجود ندارد!
                                        <TbMoodNeutral className="w-5.75 h-5.75 text-var-color-53 inline-block mr-2"/>
                                    </th>
                                </tr>
                            ) : (
                                data.transactions.map((transaction, index) => {
                                    const isLastItem = index === data.transactions.length - 1;
                                    return (
                                        <tr
                                            key={transaction.id}
                                            tabIndex={-1}
                                            onDoubleClick={() => setModal({mode: "edit", transaction})}
                                            className={`w-full grid grid-transaction items-center hover:bg-var-color-59 dark:hover:bg-var-color-52 p-4 ${
                                                !isLastItem ? "border-b border-var-color-57 dark:border-var-color-38" : ""
                                            }`}
                                        >
                                            <th className="px-2 text-center whitespace-nowrap font-IRANSansXFaNumUltraLight">{formatPersianNumber(transaction.debt)}</th>
                                            <th className="px-2 text-center whitespace-nowrap font-IRANSansXFaNumUltraLight">{formatPersianNumber(transaction.paid)}</th>
                                            <th className="px-2 text-center whitespace-nowrap font-IRANSansXFaNumUltraLight">{formatShamsi(transaction)}</th>
                                            <th className="px-2 flex justify-center items-center gap-3">
                                                <button type="button"
                                                        data-tooltip={showCustomTooltip ? "ویرایش" : undefined}
                                                        onClick={() => setModal({mode: "edit", transaction})}
                                                        onMouseLeave={() => setShowCustomTooltip(true)}
                                                        className={`${actionBtn} hover:text-var-color-53 ${showCustomTooltip ? "custom-tooltip" : ""}`}>
                                                    <HiOutlinePencilSquare className="w-5 h-5"/>
                                                </button>
                                                <button type="button"
                                                        data-tooltip={showCustomTooltip ? "حذف" : undefined}
                                                        onClick={() => setModal({mode: "delete", transaction})}
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

                {/* فوترِ جدول — مانده و وضعیت همیشه روی کلِ حساب‌اند، نه روی نتیجهٔ
                    فیلتر؛ وگرنه «مانده» با هر فیلتر عوض می‌شود و معنایش را از دست می‌دهد */}
                {!loading && customer && (
                    <footer className="shrink-0 py-3 px-8 border-t border-var-color-57 dark:border-var-color-38 flex items-center justify-between bg-var-color-00 dark:bg-var-color-43">
                        <div className="flex flex-col justify-start items-center gap-1">
                            <span className="text-var-color-06 dark:text-var-color-39 text-sm">باقیمانده حساب:</span>
                            <span className={`flex justify-center items-center h-6 px-2 rounded-full cursor-default text-[13px] font-IRANSansXFaNumLight dark:font-IRANSansXFaNumUltraLight ${STATUS_CLASSES[statusCode]}`}>
                                {customer.status}
                            </span>
                        </div>
                        <div className="flex flex-col justify-end items-center text-var-color-06 dark:text-var-color-39">
                            <span className="text-lg font-IRANSansXFaNumUltraLight">{formatPersianNumber(data.remainder)}</span>
                            <span className="text-[14px]">(تومان)</span>
                        </div>
                    </footer>
                )}
            </section>

            {/* منوی فیلترِ دوره — بیرونِ کارت رندر می‌شود تا overflow-hidden آن نبُرَدش */}
            <div
                ref={filterMenuRef}
                className={`fixed w-45 p-2.5 rounded-xl bg-var-color-00 dark:bg-var-color-43 border border-var-color-02 dark:border-var-color-38 shadow-md dark:shadow-lg z-50 origin-top transition duration-200 ease-[cubic-bezier(0.68,-0.6,0.32,1.25)] ${
                    isFilterMenuOpen ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-0 pointer-events-none"
                }`}
                style={{top: filterMenuPos?.top ?? -9999, right: filterMenuPos?.right ?? 16}}
            >
                {FILTER_ITEMS.map((item) => (
                    <MenuItem
                        key={item.key}
                        id={`${item.key}Item`}
                        text={item.text}
                        toggle="transactionsFilter"
                        active={item.key === filter && !searchPayload}
                        onClick={() => {
                            setSearchPayload(null);
                            setFilter(item.key);
                            setIsFilterMenuOpen(false);
                        }}
                    />
                ))}
            </div>

            <CustomTooltip text={tooltip.text} pos={tooltip.pos} visible={tooltip.visible}/>

            {modal && (
                <TransactionModal
                    key={`${modal.mode}-${modal.transaction?.id ?? "new"}`}
                    mode={modal.mode}
                    customerId={customerId}
                    transaction={modal.transaction}
                    onClose={() => setModal(null)}
                    onDone={() => {
                        setModal(null);
                        setRefreshKey((k) => k + 1);
                    }}
                />
            )}
        </>
    );
};

export default TransactionsTable;
