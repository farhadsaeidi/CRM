import {useCallback, useEffect, useState} from "react";
import {useSearchParams} from "react-router";
import {FiEdit2, FiPlus, FiTrash2} from "react-icons/fi";
import {HiOutlineSearch} from "react-icons/hi";
import {customersApi} from "../../api/customers.js";
import {NEW_CUSTOMER_EVENT} from "../../components/common/Header.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import CustomerModal from "./components/CustomerModal.jsx";
import {notify} from "../../lib/notify.jsx";

// همان کدهایی که سرور می‌فهمد؛ برچسب و رنگ کنارشان می‌ماند تا در یک جا عوض شود
const FILTERS = [
    {key: "all", label: "همه"},
    {key: "debt", label: "بدهکار"},
    {key: "credit", label: "بستانکار"},
    {key: "zero", label: "بی حساب"},
];

const CODE_STYLE = {
    "-1": "bg-var-color-26 text-var-color-28 border-var-color-27",
    "0": "bg-var-color-34 text-var-color-05 dark:text-var-color-03 border-var-color-02 dark:border-var-color-38",
    "1": "bg-var-color-29 text-var-color-31 border-var-color-30",
};

const formatDate = (iso) =>
    iso ? new Intl.DateTimeFormat("fa-IR", {year: "numeric", month: "2-digit", day: "2-digit"})
        .format(new Date(iso)) : "—";

const Customers = () => {
    // یوآرال منبعِ حقیقت است: رفرش و دکمهٔ back درست کار می‌کنند و جستجوی فوتر
    // هم از همین راه اثر می‌گذارد
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("query") || "";
    const filter = searchParams.get("filter") || "all";
    const page = Number(searchParams.get("page") || 1);

    const [data, setData] = useState({count: 0, results: []});
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // {mode, customer}
    // با هر تغییرِ این عدد، فهرست دوباره خوانده می‌شود (بعد از ثبت/ویرایش/حذف)
    const [refreshKey, setRefreshKey] = useState(0);

    const pageSize = 10; // برابر با PAGE_SIZE در تنظیمات DRF
    const totalPages = Math.max(1, Math.ceil(data.count / pageSize));

    // setLoading(true) عمداً اینجا نیست: setState همگام داخل بدنهٔ افکت رندرِ آبشاری
    // می‌سازد و قاعدهٔ react-hooks/set-state-in-effect جلویش را می‌گیرد. مقدار اولیهٔ
    // loading برابر true است و بعد از هر واکشی false می‌شود؛ در واکشی‌های بعدی
    // دادهٔ قبلی چند لحظه سرِ جایش می‌ماند که از پرشِ جدول بهتر است.
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

    // تغییرِ پارامترهای یوآرال با حفظِ بقیه
    const setParam = useCallback((changes) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            for (const [key, value] of Object.entries(changes)) {
                if (value === null || value === "" || value === "all" || value === 1) next.delete(key);
                else next.set(key, String(value));
            }
            return next;
        });
    }, [setSearchParams]);

    // دکمهٔ «ثبت مشتری جدید» در هدر است و از طریق رویدادِ سراسری خبر می‌دهد
    useEffect(() => {
        const onNew = () => setModal({mode: "create", customer: null});
        window.addEventListener(NEW_CUSTOMER_EVENT, onNew);
        return () => window.removeEventListener(NEW_CUSTOMER_EVENT, onNew);
    }, []);

    const onModalDone = (mode) => {
        setModal(null);
        // بعد از حذفِ تنها ردیفِ یک صفحه، آن صفحه دیگر وجود ندارد
        if (mode === "delete" && data.results.length === 1 && page > 1) setParam({page: page - 1});
        else setRefreshKey((k) => k + 1);
    };

    const iconBtn = "w-8 h-8 flex items-center justify-center rounded-lg border border-transparent transition-all duration-200 ease-in-out cursor-pointer";

    return (
        <section className="h-full flex flex-col gap-4">
            {/* نوار فیلتر و شمارش */}
            <div className="shrink-0 flex flex-wrap items-center gap-2.5 px-4.5 py-3 rounded-[18px] bg-var-color-00 dark:bg-var-color-36 border border-var-color-02 dark:border-var-color-38">
                {FILTERS.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => setParam({filter: item.key, page: 1})}
                        className={`px-3.5 py-1.5 rounded-full text-sm border transition-all duration-200 ease-in-out cursor-pointer ${
                            filter === item.key
                                ? "bg-var-color-15 border-var-color-15 text-var-color-00"
                                : "bg-transparent border-var-color-02 dark:border-var-color-38 text-var-color-06 dark:text-var-color-03 hover:border-var-color-15 hover:text-var-color-15"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}

                {/* در RTL برای چسباندن به انتهای خط از mr-auto استفاده می‌شود */}
                <div className="mr-auto flex items-center gap-3">
                    {query && (
                        <button type="button" onClick={() => setParam({query: null, page: 1})}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-var-color-13 bg-var-color-12 text-var-color-15 cursor-pointer hover:bg-var-color-15 hover:text-var-color-00 transition-all duration-200">
                            <HiOutlineSearch className="w-4 h-4"/>
                            <span>«{query}» ✕</span>
                        </button>
                    )}
                    <span className="text-sm text-var-color-05 dark:text-var-color-04">
                        {data.count.toLocaleString("fa-IR")} مشتری
                    </span>
                    {/* روی موبایل دکمهٔ هدر پنهان است، پس اینجا یکی هست */}
                    <button type="button" onClick={() => setModal({mode: "create", customer: null})}
                            className="2xs:hidden w-8 h-8 flex items-center justify-center rounded-lg btn btn-bluish">
                        <FiPlus className="w-4.5 h-4.5"/>
                    </button>
                </div>
            </div>

            {/* جدول
                سرستون و ردیف‌ها داخل یک ناحیهٔ اسکرول‌اند تا در نمای باریک با هم
                افقی حرکت کنند؛ اگر سرستون بیرون بماند با اسکرول از ستون‌ها جدا می‌افتد.
                min-w هم لازم است وگرنه ستون‌ها زیر عرضِ کفِ خودشان له می‌شوند. */}
            <div className="flex-1 min-h-0 rounded-[18px] bg-var-color-00 dark:bg-var-color-36 border border-var-color-02 dark:border-var-color-38 overflow-hidden">
                <div className="h-full overflow-auto">
                    <div className="min-w-[46rem]">
                        {/* سرستون‌ها — هنگام اسکرول عمودی بالا می‌ماند، پس پس‌زمینهٔ
                            مات لازم دارد وگرنه ردیف‌ها از زیرش دیده می‌شوند */}
                        <div className="sticky top-0 z-10 grid grid-customer gap-2 px-4 py-3 bg-var-color-00 dark:bg-var-color-36 border-b border-b-var-color-02 dark:border-b-var-color-38 text-sm text-var-color-05 dark:text-var-color-04">
                            <span>نام و نام خانوادگی</span>
                            <span>شماره تماس</span>
                            <span>تاریخ ثبت</span>
                            <span>وضعیت حساب</span>
                            <span className="text-left">عملیات</span>
                        </div>

                        {loading ? (
                        <p className="py-10 text-center text-var-color-05 dark:text-var-color-04">در حال بارگذاری ...</p>
                    ) : data.results.length === 0 ? (
                        <p className="py-10 text-center text-var-color-05 dark:text-var-color-04">
                            {query || filter !== "all" ? "مشتری‌ای با این مشخصات پیدا نشد." : "هنوز مشتری‌ای ثبت نشده است."}
                        </p>
                    ) : (
                        data.results.map((customer) => (
                            <div key={customer.id}
                                 className="grid grid-customer gap-2 items-center px-4 py-2.5 border-b border-b-var-color-02 dark:border-b-var-color-38 last:border-b-0 hover:bg-var-color-01 dark:hover:bg-var-color-37 transition-colors duration-150">
                                <span className="truncate text-var-color-08 dark:text-var-color-01">{customer.fullname}</span>
                                <span className="text-var-color-06 dark:text-var-color-03">{customer.phone}</span>
                                <span className="text-var-color-06 dark:text-var-color-03">{formatDate(customer.created)}</span>
                                <span>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs border ${CODE_STYLE[String(customer.code)]}`}>
                                        {customer.status}
                                    </span>
                                </span>
                                <span className="flex items-center justify-end gap-1.5">
                                    <button type="button" aria-label="ویرایش" data-tooltip="ویرایش"
                                            onClick={() => setModal({mode: "edit", customer})}
                                            className={`${iconBtn} custom-tooltip text-var-color-05 dark:text-var-color-03 hover:border-var-color-13 hover:bg-var-color-12 hover:text-var-color-15`}>
                                        <FiEdit2 className="w-4 h-4"/>
                                    </button>
                                    <button type="button" aria-label="حذف" data-tooltip="حذف"
                                            onClick={() => setModal({mode: "delete", customer})}
                                            className={`${iconBtn} custom-tooltip text-var-color-05 dark:text-var-color-03 hover:border-var-color-45 hover:bg-var-color-26 hover:text-var-color-28`}>
                                        <FiTrash2 className="w-4 h-4"/>
                                    </button>
                                </span>
                            </div>
                        ))
                        )}
                    </div>
                </div>
            </div>

            {/* صفحه‌بندی */}
            {!loading && totalPages > 1 && (
                <div className="shrink-0 pb-1">
                    <Pagination page={page} totalPages={totalPages} onChange={(next) => setParam({page: next})}/>
                </div>
            )}

            {modal && (
                <CustomerModal
                    // key باعث می‌شود با باز شدن روی مشتریِ دیگر، فرم از نو ساخته و
                    // مقادیرش ریست شود — بدون افکتِ ریست‌کننده
                    key={`${modal.mode}-${modal.customer?.id ?? "new"}`}
                    mode={modal.mode}
                    customer={modal.customer}
                    onClose={() => setModal(null)}
                    onDone={onModalDone}
                />
            )}
        </section>
    );
};

export default Customers;
