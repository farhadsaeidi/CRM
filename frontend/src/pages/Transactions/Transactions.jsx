import {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate, useSearchParams} from "react-router";
import {FiChevronUp, FiFilter, FiRefreshCw} from "react-icons/fi";
import {HiOutlineArrowRight, HiOutlineArrowsRightLeft} from "react-icons/hi2";
import {TbMoodNeutral} from "react-icons/tb";
import {allTransactionsApi} from "../../api/transactions.js";
import {TRANSACTION_SEARCH_EVENT} from "../../components/common/Footer.jsx";
import Breadcrumb from "../../components/common/Breadcrumb.jsx";
import CustomTooltip from "../../components/common/CustomTooltip.jsx";
import MenuItem from "../../components/common/MenuItem.jsx";
import RowSelectMark from "../../components/common/RowSelectMark.jsx";
import ScrollContainer from "../../components/common/ScrollContainer.jsx";
import {formatPersianNumber} from "../../lib/numbers.js";
import {notify} from "../../lib/notify.jsx";
import {ALL_TRANSACTIONS_PATH, customerLedgerPath} from "../../lib/paths.js";
import {useGoBack} from "../../lib/useGoBack.js";

// همان پنج گزینهٔ فیلترِ دورهٔ جدولِ تراکنش‌های یک مشتری
const FILTER_ITEMS = [
    {key: "all", text: "همه", button: "فیلترها"},
    {key: "today", text: "امروز", button: "امروز"},
    {key: "week", text: "هفته جاری", button: "هفته جاری"},
    {key: "month", text: "ماه جاری", button: "ماه جاری"},
    {key: "year", text: "سال جاری", button: "سال جاری"},
];

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFaDigits = (value) => String(value).replace(/\d/g, (digit) => FA_DIGITS[digit]);
const formatShamsi = ({year, month, day}) =>
    year && month && day
        ? toFaDigits(`${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`)
        : "—";

// چقدر مانده به انتهای فهرست، صفحهٔ بعد را بیاوریم
const LOAD_AHEAD_PX = 240;
// از چند پیکسل مانده به ته، دیگر مه‌آلودی لازم نیست — «ادامه‌ای» در کار نیست
const FOG_HIDE_PX = 24;
// تاخیرِ پلکانیِ ورودِ ردیف‌های تازه. سقف دارد وگرنه ردیفِ بیست‌وپنجمِ هر صفحه
// یک ثانیه بعد از اولی پیدا می‌شد.
const ROW_STAGGER_MS = 45;
const ROW_STAGGER_MAX = 10;

/**
 * جدولِ همهٔ تراکنش‌های مالک، از همهٔ مشتری‌ها.
 *
 * برخلافِ دفترِ یک مشتری اینجا صفحه‌بندی لازم است چون تعداد می‌تواند خیلی زیاد
 * باشد؛ ولی به‌جای شماره‌صفحه، **اسکرول بی‌نهایت** است: با نزدیک شدن به انتهای
 * فهرست صفحهٔ بعد گرفته و به همان‌ها اضافه می‌شود.
 *
 * اسکرول‌بار عمداً نمایش داده نمی‌شود: نشانهٔ «ادامه دارد» در این جدول مه‌آلودیِ
 * پایینِ کارت است، و دو نشانه برای یک چیز نویز است.
 */
const Transactions = () => {
    const navigate = useNavigate();
    const goBack = useGoBack();
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("query") || "";
    const filter = searchParams.get("tfilter") || "all";

    // جستجوی تاریخ از نوارِ فوتر می‌آید و بدنهٔ POST دارد، پس برخلافِ جستجوی نام
    // در یوآرال نمی‌نشیند
    const [searchPayload, setSearchPayload] = useState(null);

    // یوآرال و جستجوی جاری به‌صورت یک کلید — هم برای ریست کردنِ فهرست و هم برای
    // دور ریختنِ پاسخی که وسطِ راه، شرطش عوض شده
    const paramsKey = `${query}|${filter}|${searchPayload ? JSON.stringify(searchPayload) : ""}`;

    // ردیف‌ها و وضعیتِ صفحه‌بندی در یک state جمع‌اند تا ریست کردنشان یک عمل باشد
    // و نیازی به نوشتن در ref حین رندر نباشد (قاعدهٔ react-hooks/refs).
    // `freshFrom` اندیسِ اولین ردیفِ آخرین صفحه است — فقط همان‌ها انیمیشنِ ورود
    // می‌گیرند، وگرنه با هر صفحهٔ تازه کلِ جدول دوباره ظاهر می‌شد.
    const [feed, setFeed] = useState({rows: [], nextPage: 1, end: false, total: 0, freshFrom: 0, key: paramsKey});
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    // آیا هنوز محتوایی زیرِ لبهٔ پایینِ ناحیه هست؟ مه‌آلودی از همین می‌آید.
    const [hasMoreBelow, setHasMoreBelow] = useState(false);
    const {rows, freshFrom} = feed;
    const reachedEnd = feed.end;
    const toggleSelected = (id) => setSelectedId((current) => (current === id ? null : id));

    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [filterMenuPos, setFilterMenuPos] = useState(null);
    const [tooltip, setTooltip] = useState({text: "", pos: null, visible: false});

    const filterBtnRef = useRef(null);
    const filterMenuRef = useRef(null);
    const refreshBtnRef = useRef(null);
    const backBtnRef = useRef(null);
    const viewportRef = useRef(null);

    // قفلِ «یک درخواست در راه است» — تنها چیزی که باید بینِ رندرها زنده بماند و
    // هندلرِ اسکرول مقدارِ همین لحظه‌اش را ببیند. فقط داخل callback نوشته می‌شود.
    const inFlight = useRef(false);

    const showTooltip = (ref, text) => {
        const rect = ref.current?.getBoundingClientRect();
        if (rect) setTooltip({text, pos: {top: rect.top, left: rect.left + rect.width / 2}, visible: true});
    };
    const hideTooltip = () => setTooltip((t) => ({...t, visible: false}));

    const activeFilter = FILTER_ITEMS.find((item) => item.key === filter) ?? FILTER_ITEMS[0];

    const loadNextPage = useCallback(async () => {
        if (inFlight.current || feed.end) return;
        inFlight.current = true;
        setLoading(true);
        const page = feed.nextPage;
        const key = feed.key;
        try {
            // با جستجوی تاریخ، endpoint عوض می‌شود ولی شکلِ پاسخ (count/next/results)
            // یکی است، پس بقیهٔ منطقِ اسکرول دست نمی‌خورد
            const res = searchPayload
                ? await allTransactionsApi.search({page, payload: searchPayload})
                : await allTransactionsApi.list({page, query, filter});
            // اگر بینِ درخواست و پاسخ فیلتر یا جستجو عوض شده، این پاسخ مالِ فهرستِ
            // دیگری است و باید دور ریخته شود — با updater فرمی، وضعیتِ همان لحظه دیده می‌شود
            setFeed((prev) => (prev.key !== key ? prev : {
                ...prev,
                rows: [...prev.rows, ...(res.results ?? [])],
                nextPage: res.next ? page + 1 : page,
                end: !res.next,
                total: res.count ?? 0,
                freshFrom: prev.rows.length,
            }));
        } catch {
            notify("دریافت تراکنش‌ها ناموفق بود.", "error");
            // بدون این، هندلرِ اسکرول بی‌وقفه دوباره تلاش می‌کند
            setFeed((prev) => (prev.key !== key ? prev : {...prev, end: true}));
        } finally {
            inFlight.current = false;
            setLoading(false);
        }
    }, [feed.end, feed.nextPage, feed.key, query, filter, searchPayload]);

    // با عوض شدنِ جستجو یا فیلتر، فهرست از صفر شروع می‌شود.
    // این «state مشتق از یوآرال» است، پس با مقایسه در حین رندر انجام می‌شود نه
    // با افکت — قاعدهٔ set-state-in-effect. همان الگویی که فوتر هم دارد.
    if (feed.key !== paramsKey) {
        setFeed({rows: [], nextPage: 1, end: false, total: 0, freshFrom: 0, key: paramsKey});
        setSelectedId(null);
    }

    // اسکرولِ بی‌نهایت. همین افکت صفحهٔ اول را هم می‌آورد: با فهرستِ خالی فاصله تا
    // انتها صفر است، پس شرطِ زیر برقرار می‌شود.
    // اگر بعد از یک صفحه هنوز محتوا کوتاه‌تر از خودِ ناحیه باشد (نمایشگرِ بلند)،
    // چون به rows.length وابسته است دوباره اجرا و صفحهٔ بعد گرفته می‌شود؛ وگرنه
    // اسکرولی رخ نمی‌داد که ادامه را تریگر کند.
    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const maybeLoad = () => {
            const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
            // مه‌آلودی همین‌جا به‌روز می‌شود و نه در یک شنوندهٔ جدا: هر دو یک عدد
            // می‌خواهند و دو شنوندهٔ scroll روی یک عنصر یعنی دو بار همان محاسبه
            setHasMoreBelow(remaining > FOG_HIDE_PX);
            if (inFlight.current) return;
            if (remaining <= LOAD_AHEAD_PX) loadNextPage();
        };
        // داخلِ rAF و نه مستقیم در بدنهٔ افکت: loadNextPage همان اول setState می‌زند
        const frame = requestAnimationFrame(maybeLoad);
        viewport.addEventListener("scroll", maybeLoad);
        return () => {
            cancelAnimationFrame(frame);
            viewport.removeEventListener("scroll", maybeLoad);
        };
        // `loading` هم در وابستگی‌هاست: اگر موقعِ ریست یک درخواست در راه بود،
        // با تمام شدنش این افکت دوباره اجرا و صفحهٔ اولِ فهرستِ تازه گرفته می‌شود
    }, [loadNextPage, rows.length, loading]);

    const setParam = useCallback((changes) => setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === "" || value === "all") params.delete(key);
            else params.set(key, String(value));
        }
        return params;
    }), [setSearchParams]);

    // جستجوی تاریخ از نوارِ فوتر می‌آید. رویدادِ سراسری همان الگویی است که برای
    // دکمهٔ «ثبت مشتری جدید» هدر به کار رفت: فوتر بیرونِ درختِ صفحه است.
    useEffect(() => {
        const onSearch = (event) => {
            const payload = event.detail ?? null;
            // جستجو و فیلترِ دوره جایگزین یکدیگرند؛ سرور در endpoint جستجو
            // پارامترِ دوره نمی‌گیرد و نگه‌داشتنِ هر دو یعنی نمایشِ گمراه‌کننده
            if (payload) setParam({tfilter: null});
            setSearchPayload(payload);
        };
        window.addEventListener(TRANSACTION_SEARCH_EVENT, onSearch);
        return () => window.removeEventListener(TRANSACTION_SEARCH_EVENT, onSearch);
    }, [setParam]);

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

    const isEmpty = !loading && rows.length === 0;

    return (
        <section className="h-full min-h-0 flex flex-col">
            <div className="w-[90%] mx-auto min-w-0 min-h-0 flex flex-col max-h-full">
                <Breadcrumb items={[
                    {label: "همه تراکنش ها", to: ALL_TRANSACTIONS_PATH, icon: HiOutlineArrowsRightLeft},
                ]}/>
                <section className="w-full rounded-xl border border-var-color-57 dark:border-var-color-38 overflow-hidden flex flex-col max-h-full">
                    {/* هدر جدول */}
                    <header className="shrink-0 w-full bg-var-color-00 dark:bg-var-color-43 border-b border-var-color-57 dark:border-var-color-38">
                        <div className="relative flex flex-row justify-between items-center py-2 px-3.5">
                            {/* بازگشت به صفحهٔ قبل — این صفحه سایدبار ندارد، پس راهِ
                                برگشتش همین دکمه است */}
                            <button type="button" ref={backBtnRef}
                                    onClick={() => {
                                        hideTooltip();
                                        goBack();
                                    }}
                                    onMouseEnter={() => showTooltip(backBtnRef, "بازگشت")}
                                    onMouseLeave={hideTooltip}
                                    className="rounded-full btn btn-bluish">
                                <div className="w-7 h-7 flex justify-center items-center">
                                    <HiOutlineArrowRight className="w-4.5 h-4.5"/>
                                </div>
                            </button>

                            <div className="hidden lg:block absolute left-1/2 -translate-x-1/2 font-MorabbaMedium dark:font-MorabbaLight text-[25px] text-var-color-08 dark:text-var-color-02 tracking-wide whitespace-nowrap">
                                جدول تراکنش های مالی
                            </div>

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
                                            // بازنشانی یعنی برگشتن به فهرستِ کامل: هم یوآرال
                                            // و هم جستجوی تاریخ که در یوآرال نیست
                                            setSearchPayload(null);
                                            setParam({query: null, tfilter: null});
                                        }}
                                        onMouseEnter={() => showTooltip(refreshBtnRef, "بازنشانی جدول")}
                                        onMouseLeave={hideTooltip}
                                        className="rounded-full btn btn-bluish">
                                    <div className="w-7 h-7 flex justify-center items-center">
                                        <FiRefreshCw className="w-4 h-4"/>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* بدنه — اسکرولِ بی‌نهایت روی همین ناحیه */}
                    <div className="relative flex-1 min-h-0 flex flex-col">
                        <ScrollContainer viewportRef={viewportRef} hideScrollbars className="flex-1 min-h-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="w-full sticky top-0 z-[1]">
                                    <tr className="w-full grid grid-all-transactions items-center bg-var-color-59 dark:bg-var-color-52 text-sm text-var-color-60 dark:text-var-color-51 border-b border-var-color-57 dark:border-var-color-38 font-IRANSansXFaNumLight px-4 py-3">
                                        <th/>
                                        <th className="px-2 text-right">مشتری</th>
                                        <th className="px-2 text-center">مبلغ نسیه (تومان)</th>
                                        <th className="px-2 text-center">مبلغ پرداختی (تومان)</th>
                                        <th className="px-2 text-center">تاریخ تراکنش</th>
                                        <th className="px-2 text-center">عملیات</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-var-color-58 dark:bg-var-color-37 text-[15px] text-var-color-06 dark:text-var-color-46 font-IRANSansXFaNumLight">
                                    {isEmpty ? (
                                        <tr className="w-full">
                                            <th className="block text-var-color-06 dark:text-var-color-39 text-center p-4 font-IRANSansXFaNumLight">
                                                محتوایی برای نمایش وجود ندارد!
                                                <TbMoodNeutral className="w-5.75 h-5.75 text-var-color-53 inline-block mr-2"/>
                                            </th>
                                        </tr>
                                    ) : (
                                        rows.map((row, index) => {
                                            // فقط ردیف‌های صفحهٔ آخر انیمیشنِ ورود می‌گیرند
                                            const isFresh = index >= freshFrom;
                                            return (
                                                <tr
                                                    key={row.id}
                                                    tabIndex={-1}
                                                    aria-selected={selectedId === row.id}
                                                    onClick={() => toggleSelected(row.id)}
                                                    style={isFresh
                                                        ? {animationDelay: `${Math.min(index - freshFrom, ROW_STAGGER_MAX) * ROW_STAGGER_MS}ms`}
                                                        : undefined}
                                                    className={`w-full grid grid-all-transactions items-center cursor-pointer hover:bg-var-color-59 dark:hover:bg-var-color-52 p-4 border-b border-var-color-57 dark:border-var-color-38 ${
                                                        isFresh ? "animate-fade-up" : ""
                                                    }`}
                                                >
                                                    <th className="flex items-center justify-center">
                                                        <RowSelectMark selected={selectedId === row.id}/>
                                                    </th>
                                                    <th className="px-2 text-right whitespace-nowrap overflow-hidden text-ellipsis">{row.customer_fullname}</th>
                                                    <th className="px-2 text-center whitespace-nowrap font-IRANSansXFaNumUltraLight">{formatPersianNumber(row.debt)}</th>
                                                    <th className="px-2 text-center whitespace-nowrap font-IRANSansXFaNumUltraLight">{formatPersianNumber(row.paid)}</th>
                                                    <th className="px-2 text-center whitespace-nowrap font-IRANSansXFaNumUltraLight">{formatShamsi(row)}</th>
                                                    <th className="px-2 flex justify-center items-center">
                                                        <button type="button"
                                                                aria-label="دفتر حساب این مشتری"
                                                                data-tooltip="دفتر حساب مشتری"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(customerLedgerPath(row.customer_id));
                                                                }}
                                                                className="cursor-pointer transition-all duration-200 ease-in-out hover:text-var-color-15 custom-tooltip">
                                                            <HiOutlineArrowsRightLeft className="w-5 h-5"/>
                                                        </button>
                                                    </th>
                                                </tr>
                                            );
                                        })
                                    )}

                                    {/* نوارِ پایین: در حال گرفتنِ صفحهٔ بعد، یا رسیدن به انتها */}
                                    {loading && (
                                        <tr className="w-full">
                                            <th className="block p-4">
                                                <span className="flex justify-center items-center gap-1.5">
                                                    {[0, 1, 2].map((dot) => (
                                                        <span key={dot}
                                                              className="w-1.5 h-1.5 rounded-full bg-var-color-15 animate-bounce"
                                                              style={{animationDelay: `${dot * 120}ms`}}/>
                                                    ))}
                                                </span>
                                            </th>
                                        </tr>
                                    )}
                                    {!loading && reachedEnd && rows.length > 0 && (
                                        <tr className="w-full">
                                            <th className="block text-center p-3 text-[13px] text-var-color-04 dark:text-var-color-39 font-IRANSansXFaNumLight">
                                                پایان فهرست
                                            </th>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </ScrollContainer>

                        {/* مه‌آلودیِ پایینِ جدول — به‌جای اسکرول‌بار می‌گوید «ادامه دارد»،
                            و با رسیدن به ته فهرست محو می‌شود */}
                        <div
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-x-0 bottom-0 h-32 transition-opacity duration-300 ease-out bg-[linear-gradient(to_top,var(--color-var-color-58),transparent)] dark:bg-[linear-gradient(to_top,var(--color-var-color-37),transparent)] ${
                                hasMoreBelow && rows.length > 0 ? "opacity-100" : "opacity-0"
                            }`}
                        />
                    </div>
                </section>
            </div>

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
                        active={item.key === filter}
                        onClick={() => {
                            // فیلترِ دوره جایگزینِ جستجوی تاریخ است، نه کنارِ آن
                            setSearchPayload(null);
                            setParam({tfilter: item.key});
                            setIsFilterMenuOpen(false);
                        }}
                    />
                ))}
            </div>

            <CustomTooltip text={tooltip.text} pos={tooltip.pos} visible={tooltip.visible}/>
        </section>
    );
};

export default Transactions;
