import {useEffect, useState} from "react";
import {FiCheck, FiUsers} from "react-icons/fi";
import {HiOutlineSearch} from "react-icons/hi";
import {IoIosClose} from "react-icons/io";
import ModalActions from "./ModalActions.jsx";
import ModalCloseButton from "./ModalCloseButton.jsx";
import Pagination from "./Pagination.jsx";
import RowSelectMark from "./RowSelectMark.jsx";
import ScrollContainer from "./ScrollContainer.jsx";
import {customersApi} from "../../api/customers.js";
import {errorMessage} from "../../lib/apiError.js";
import {toFaDigits} from "../../lib/chart.js";
import {notify} from "../../lib/notify.jsx";

const PAGE_SIZE = 5;   // برابر با CustomerPagination.page_size در بک‌اند
const EMPTY = {count: 0, results: []};

// همان کادرِ جستجوی فوتر — شکلش عمداً یکی است تا کاربر دو زبانِ متفاوت یاد نگیرد
const SEARCH_BOX = "relative w-full h-9 rounded-full border border-var-color-02 dark:border-var-color-38 " +
    "bg-var-color-01 dark:bg-var-color-40 transition-colors duration-200 " +
    "has-[:focus]:border-var-color-15";
const SEARCH_INPUT = "w-full h-full text-[13px] rounded-full bg-transparent pr-9 pl-8 " +
    "text-var-color-06 dark:text-var-color-01 focus:outline-none caret-var-color-15 input-placeholder";

/**
 * انتخابِ مشتری برای ثبتِ تراکنش از صفحهٔ «همه تراکنش‌ها».
 *
 * چرا لازم است؟ تراکنش بدونِ مشتری معنا ندارد، ولی آن صفحه به مشتریِ خاصی گره
 * نخورده. پس اول باید پرسید «برای چه کسی؟» و بعد به دفترِ همان مشتری رفت.
 *
 * جدولِ اینجا عمداً **فقط دو ستون** دارد (نام و شماره): وضعیت و تاریخ و دکمه‌های
 * عملیات به این تصمیم ربطی ندارند و فقط چشم را شلوغ می‌کنند.
 */
const CustomerPickerModal = ({open, onClose, onPick}) => {
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [isClosing, setIsClosing] = useState(false);

    // با هر بار باز شدن، از نو — جستجو و صفحهٔ دفعهٔ قبل نباید بماند
    const [wasOpen, setWasOpen] = useState(open);
    if (wasOpen !== open) {
        setWasOpen(open);
        if (open) {
            setQuery("");
            setPage(1);
            setSelected(null);
            setData(EMPTY);
            setLoading(true);
            setIsClosing(false);
        }
    }

    // جستجو زنده است ولی با مکث، وگرنه هر حرف یک درخواست می‌شود
    useEffect(() => {
        if (!open) return undefined;
        let ignore = false;
        const timer = setTimeout(() => {
            customersApi.list({page, query: query.trim()})
                .then((res) => {
                    if (!ignore) setData(res);
                })
                .catch((err) => {
                    if (!ignore) notify(errorMessage(err, "دریافت فهرست مشتریان ناموفق بود."), "error");
                })
                .finally(() => {
                    if (!ignore) setLoading(false);
                });
        }, query ? 300 : 0);
        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, [open, page, query]);

    const requestClose = () => setIsClosing(true);
    const handleAnimationEnd = () => {
        if (isClosing) onClose();
    };

    const rows = data.results ?? [];
    const totalPages = Math.max(1, Math.ceil((data.count ?? 0) / PAGE_SIZE));

    // تاییدِ انتخاب. دابل‌کلیک همین را با مشتریِ زیرِ نشانگر صدا می‌زند، پس
    // انتخابِ قبلی را دور می‌زند و لازم نیست اول ردیف انتخاب شود.
    const confirm = (customer = selected) => {
        if (!customer) {
            notify("اول یک مشتری را انتخاب کنید.", "warning");
            return;
        }
        onPick(customer);
        requestClose();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-3
                        bg-black/50 backdrop-blur-sm dark:bg-black/40 dark:backdrop-blur-lg"
             onClick={requestClose} role="dialog" aria-modal="true" aria-label="انتخاب مشتری">
            <section
                onClick={(e) => e.stopPropagation()}
                onAnimationEnd={handleAnimationEnd}
                className={`relative w-full max-w-140 max-h-[calc(100vh-1.5rem)] rounded-[18px] p-4 2xs:p-5
                            flex flex-col gap-3.5
                            bg-var-color-00 dark:bg-var-color-37
                            border border-var-color-02 dark:border-var-color-38
                            shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] ${
                    isClosing ? "animate-modal-out" : "animate-modal-in"
                }`}
            >
                {/* در RTL اولین فرزند راست‌ترین است، پس عنوان راست و ✕ چپ می‌نشیند */}
                <header className="shrink-0 flex items-center justify-between gap-3">
                    <div className="flex flex-row justify-start items-center gap-2 min-w-0">
                        <span className="w-7 h-7 shrink-0 flex justify-center items-center rounded-full
                                         text-var-color-01 dark:text-var-color-15
                                         bg-var-color-15 dark:bg-var-color-12
                                         border border-var-color-15 dark:border-var-color-42">
                            <FiUsers className="w-3.5 h-3.5"/>
                        </span>
                        <h3 className="m-0 text-[16px] font-IRANSansXFaNumDemiBold truncate
                                       text-var-color-06 dark:text-var-color-01">انتخاب مشتری</h3>
                    </div>
                    <ModalCloseButton size="sm" onClick={requestClose}/>
                </header>

                <div className="min-h-0 flex flex-col rounded-xl overflow-hidden
                                border border-var-color-57 dark:border-var-color-38">
                    {/* هدرِ جدول — کادر جستجو */}
                    <div className="shrink-0 p-2.5 bg-var-color-00 dark:bg-var-color-43
                                    border-b border-var-color-57 dark:border-var-color-38">
                        <div className={SEARCH_BOX}>
                            <HiOutlineSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5
                                                        text-var-color-15 pointer-events-none"/>
                            <input
                                type="text"
                                autoFocus
                                value={query}
                                placeholder="جستجوی نام یا شماره تماس مشتری ..."
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    // نتیجهٔ جستجوی تازه از صفحهٔ یک شروع می‌شود، وگرنه
                                    // ممکن است روی صفحه‌ای بایستد که دیگر وجود ندارد
                                    setPage(1);
                                }}
                                className={SEARCH_INPUT}
                            />
                            <button type="button" aria-label="پاک کردن جستجو"
                                    onClick={() => {
                                        setQuery("");
                                        setPage(1);
                                    }}
                                    className={`absolute left-1.75 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full
                                                items-center justify-center text-xl cursor-pointer
                                                text-var-color-04 dark:text-var-color-39
                                                hover:bg-var-color-02 dark:hover:bg-var-color-44
                                                transition-colors duration-200 ${query ? "flex" : "hidden"}`}>
                                <IoIosClose/>
                            </button>
                        </div>
                    </div>

                    {/* سرستون‌ها — داخلِ همان ناحیه‌ای که اسکرول می‌شود نیستند چون
                        فهرست کوتاه و صفحه‌بندی‌شده است و اسکرولِ افقی ندارد */}
                    <div className="shrink-0 grid grid-customer-picker items-center px-4 py-2.5
                                    text-sm font-IRANSansXFaNumLight
                                    bg-var-color-59 dark:bg-var-color-52
                                    text-var-color-60 dark:text-var-color-51
                                    border-b border-var-color-57 dark:border-var-color-38">
                        <span/>
                        <span className="px-2 text-right">نام و نام خانوادگی</span>
                        <span className="px-2 text-center">شماره تماس</span>
                    </div>

                    <ScrollContainer className="flex-1 min-h-0 h-customer-picker-5"
                                     overflowX="hidden" trackPadding={8}>
                        <div className="bg-var-color-58 dark:bg-var-color-37">
                            {loading ? (
                                [0, 1, 2, 3, 4].map((index) => (
                                    <div key={index} className="animate-pulse h-11 mx-3 my-1.5 rounded-lg
                                                                bg-var-color-01 dark:bg-var-color-40"/>
                                ))
                            ) : rows.length === 0 ? (
                                <p className="m-0 py-10 text-center text-[13px]
                                              text-var-color-04 dark:text-var-color-39">
                                    {query ? "مشتری‌ای با این مشخصات پیدا نشد." : "هنوز مشتری‌ای ثبت نشده است."}
                                </p>
                            ) : rows.map((customer, index) => (
                                // انتخاب با کلیک، و دابل‌کلیک مستقیم تایید می‌کند
                                <div
                                    key={customer.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-selected={selected?.id === customer.id}
                                    onClick={() => setSelected(customer)}
                                    onDoubleClick={() => confirm(customer)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") confirm(customer);
                                        else if (e.key === " ") {
                                            e.preventDefault();
                                            setSelected(customer);
                                        }
                                    }}
                                    className={`grid grid-customer-picker items-center px-4 py-3 cursor-pointer
                                                text-[15px] font-IRANSansXFaNumLight
                                                text-var-color-06 dark:text-var-color-46
                                                transition-colors duration-200
                                                hover:bg-var-color-59 dark:hover:bg-var-color-52 ${
                                        index < rows.length - 1
                                            ? "border-b border-var-color-57 dark:border-var-color-38" : ""
                                    } ${
                                        selected?.id === customer.id ? "bg-var-color-59 dark:bg-var-color-52" : ""
                                    }`}
                                >
                                    <span className="flex items-center justify-center">
                                        <RowSelectMark selected={selected?.id === customer.id}/>
                                    </span>
                                    <span className="px-2 text-right truncate">{customer.fullname}</span>
                                    <span className="px-2 text-center whitespace-nowrap
                                                     font-IRANSansXFaNumUltraLight">
                                        {toFaDigits(customer.phone)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </ScrollContainer>

                    {/* فوترِ جدول — صفحه‌بندی، مثل جدولِ مشتریان */}
                    {!loading && totalPages > 1 && (
                        <div className="shrink-0 flex justify-center py-2
                                        bg-var-color-00 dark:bg-var-color-43
                                        border-t border-var-color-57 dark:border-var-color-38">
                            <Pagination page={page} totalPages={totalPages} onPageClick={setPage}/>
                        </div>
                    )}
                </div>

                <p className="m-0 shrink-0 text-[11px] leading-6 text-var-color-04 dark:text-var-color-39">
                    یک ردیف را انتخاب کنید و «انتخاب» را بزنید، یا روی ردیف <span
                    className="text-var-color-15">دوبار کلیک</span> کنید.
                </p>

                <ModalActions
                    mode="create"
                    config={{icon: FiCheck, submit: "انتخاب", button: "btn-bluish",
                             submitIcon: "w-4.5 h-4.5 ml-1.5"}}
                    submitting={false}
                    onSubmit={() => confirm()}
                    onCancel={requestClose}
                />
            </section>
        </div>
    );
};

export default CustomerPickerModal;
