import {useEffect, useId, useRef, useState} from "react";
import toast from "react-hot-toast";
import {IoClose} from "react-icons/io5";
import {FaRegUser} from "react-icons/fa6";
import {GrPhone} from "react-icons/gr";
import {HiOutlinePencilSquare, HiOutlineTrash} from "react-icons/hi2";
import {FiPlus} from "react-icons/fi";
import {customersApi} from "../../../api/customers.js";
import {notify, notifyLoading} from "../../../lib/notify.jsx";
import {sanitizePhone} from "../../../lib/utils.js";
import {customerSchema} from "../../../validators/customer.js";

// یک مودال برای هر سه کار — ساخت، ویرایش و حذف. سه کامپوننت جدا یعنی سه نسخهٔ
// واگرا از همان فرم؛ در پروژهٔ قدیمی همین اتفاق افتاده بود.
// چیدمان و رنگ‌بندی از همان پروژه می‌آید: نوارِ رنگیِ بالای کارت، نشانِ گردِ کنارِ
// عنوان، و یک دکمهٔ اقدام در پایینِ سمت چپ (انصراف عمداً نیست — بستن با ✕ است).
const MODES = {
    create: {
        title: "ثبت مشتری جدید",
        submit: "ثبت مشتری",
        icon: FiPlus,
        topBorder: "border-t-var-color-15!",
        badge: "text-var-color-01 dark:text-var-color-15 bg-var-color-15 dark:bg-var-color-12 border border-var-color-15 dark:border-var-color-42 rounded-full",
        badgeIcon: "w-8 h-8",
        button: "btn-bluish",
        submitIcon: "w-7 h-7 ml-0.5",
    },
    edit: {
        title: "ویرایش مشتری",
        submit: "ویرایش مشتری",
        icon: HiOutlinePencilSquare,
        topBorder: "border-t-var-color-53!",
        badge: "text-var-color-53",
        badgeIcon: "w-7 h-7",
        button: "btn-yellowish",
        submitIcon: "w-4.5 h-4.5 mx-2",
    },
    delete: {
        title: "حذف مشتری",
        submit: "حذف مشتری",
        icon: IoClose,
        topBorder: "border-t-var-color-28!",
        badge: "text-var-color-01 dark:text-var-color-28 bg-var-color-28 dark:bg-var-color-26 border border-var-color-28 dark:border-var-color-27 rounded-full",
        badgeIcon: "w-8 h-8",
        button: "btn-redish",
        submitIcon: "w-5 h-5 mx-2",
    },
};

const CustomerModal = ({mode, customer, onClose, onDone}) => {
    const id = useId();
    const config = MODES[mode] ?? MODES.create;
    const BadgeIcon = config.icon;
    const SubmitIcon = config.icon;

    // مقادیر مستقیم از پراپ‌ها مقداردهیِ اولیه می‌شوند و ریست‌شان با key در والد
    // انجام می‌گیرد، نه با افکت — ریست کردنِ state داخل افکت رندرِ آبشاری می‌سازد.
    const [fullname, setFullname] = useState(customer?.fullname ?? "");
    const [phone, setPhone] = useState(customer?.phone ?? "");
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const modalRef = useRef(null);
    const inputsRef = useRef([]);
    const setInputRef = (index) => (el) => {
        // eslint-disable-next-line react-hooks/refs
        inputsRef.current[index] = el;
    };

    // بستن با انیمیشن: کلاسِ خروج می‌نشیند و بعدِ پایانِ انیمیشن مودال برداشته می‌شود
    const requestClose = () => {
        if (submitting) return;
        setIsClosing(true);
    };
    const handleAnimationEnd = () => {
        if (isClosing) onClose();
    };

    // فوکوس روی اولین ورودی، و چرخشِ Tab داخل مودال
    useEffect(() => {
        const timer = setTimeout(() => inputsRef.current[0]?.focus(), 50);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                requestClose();
                return;
            }
            if (event.key !== "Tab") return;
            const inputs = inputsRef.current.filter((el) => el && el.offsetParent !== null);
            if (inputs.length === 0) return;
            const current = inputs.indexOf(document.activeElement);
            if (current === -1) return;
            // Tab از آخرین ورودی به اولی برمی‌گردد تا فوکوس از مودال بیرون نرود
            event.preventDefault();
            const next = event.shiftKey
                ? (current === 0 ? inputs.length - 1 : current - 1)
                : (current === inputs.length - 1 ? 0 : current + 1);
            inputs[next]?.focus();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    });

    const onSubmit = async () => {
        if (submitting) return;

        if (mode !== "delete") {
            const parsed = customerSchema.safeParse({fullname, phone});
            if (!parsed.success) {
                const issue = parsed.error.issues[0];
                setErrors({[issue.path[0]]: issue.message});
                notify(issue.message, "error");
                return;
            }
        }

        setSubmitting(true);
        const loadingId = notifyLoading();
        try {
            let res;
            if (mode === "create") res = await customersApi.create({fullname, phone});
            else if (mode === "edit") res = await customersApi.update(customer.id, {fullname, phone});
            else res = await customersApi.remove(customer.id);

            toast.dismiss(loadingId);
            notify(res?.message || "انجام شد.", "success", 2000);
            onDone(mode);
        } catch (err) {
            toast.dismiss(loadingId);
            const data = err?.data || {};
            // خطاهای سریالایزر DRF به شکل {field: ["پیام"]} می‌آیند
            const fieldKey = Object.keys(data).find((key) => Array.isArray(data[key]));
            if (fieldKey) {
                const message = data[fieldKey][0];
                setErrors({[fieldKey]: message});
                notify(message, "error");
            } else {
                notify(data.detail || data.message || "عملیات ناموفق بود. لطفاً دوباره تلاش کنید...", "error");
            }
            setSubmitting(false);
        }
    };

    // اینتر روی ورودی‌ها فرم را می‌فرستد
    const onInputKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
        }
    };

    const inputClass = (hasError) =>
        `w-full h-full text-[15px] pr-8.5 rounded-xl input input-bluish input-placeholder ${hasError ? "input-error" : ""}`;

    return (
        <section
            onClick={requestClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/40 dark:backdrop-blur-lg"
        >
            <div
                ref={modalRef}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                onAnimationEnd={handleAnimationEnd}
                className={`w-120 max-w-[calc(100vw-2rem)] rounded-3xl px-6 pt-6 pb-8 form-container ${config.topBorder} border-t-5! ${
                    isClosing ? "animate-modal-out" : "animate-modal-in"
                }`}
            >
                <header className="w-full flex flex-row justify-between items-center">
                    <div className="flex flex-row justify-start items-center">
                        <div className={`flex justify-center items-center ml-2 ${config.badge}`}>
                            <BadgeIcon className={config.badgeIcon}/>
                        </div>
                        <h2 className="text-var-color-08 dark:text-var-color-01 text-lg text-center">{config.title}</h2>
                    </div>
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={requestClose}
                        aria-label="بستن"
                        className="w-7.5 h-7.5 cursor-pointer text-var-color-08 dark:text-var-color-01 hover:text-var-color-28 transition-all duration-200 ease-in-out"
                    >
                        <IoClose className="w-full h-full"/>
                    </button>
                </header>

                {mode === "delete" ? (
                    <main className="w-full mt-3 pr-3.5">
                        <p className="text-var-color-06 dark:text-var-color-03 text-[15px] leading-7">
                            با حذف مشتری مورد نظر ({customer?.fullname})، تمامی تراکنش های مالی مربوط به این
                            مشتری حذف خواهد شد. آیا اطمینان دارید؟
                        </p>
                    </main>
                ) : (
                    <main className="w-full mt-5">
                        <div className="w-full">
                            <label className="text-var-color-06 dark:text-var-color-03" htmlFor={id + "fullname"}>
                                نام و نام خانوادگی
                            </label>
                            <div className="relative w-full h-10 mt-2 rounded-xl">
                                <FaRegUser className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-15 pointer-events-none"/>
                                <input
                                    id={id + "fullname"}
                                    ref={setInputRef(0)}
                                    type="text"
                                    autoComplete="off"
                                    value={fullname}
                                    placeholder="نام و نام خانوادگی مشتری..."
                                    onChange={(e) => {
                                        setFullname(e.target.value);
                                        setErrors((prev) => ({...prev, fullname: ""}));
                                    }}
                                    onKeyDown={onInputKeyDown}
                                    className={inputClass(errors.fullname)}
                                />
                            </div>
                        </div>

                        <div className="w-full my-6">
                            <label className="text-var-color-06 dark:text-var-color-03" htmlFor={id + "phone"}>
                                شماره همراه
                            </label>
                            <div className="relative w-full h-10 mt-2 rounded-xl">
                                <GrPhone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-15 pointer-events-none"/>
                                <input
                                    id={id + "phone"}
                                    ref={setInputRef(1)}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    value={phone}
                                    placeholder="شماره همراه مشتری..."
                                    onChange={(e) => {
                                        setPhone(sanitizePhone(e.target.value));
                                        setErrors((prev) => ({...prev, phone: ""}));
                                    }}
                                    onKeyDown={onInputKeyDown}
                                    className={inputClass(errors.phone)}
                                />
                            </div>
                        </div>
                    </main>
                )}

                <footer className={`flex flex-row justify-end items-center gap-1.5 ${mode === "delete" ? "mt-3.5" : ""}`}>
                    <button
                        type="button"
                        tabIndex={-1}
                        disabled={submitting}
                        onClick={onSubmit}
                        className={`py-1.5 pl-3 pr-1 rounded-xl btn ${config.button} disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {mode === "delete" ? <HiOutlineTrash className={config.submitIcon}/> : <SubmitIcon className={config.submitIcon}/>}
                        <h2 className="m-0 text-[17px]">{submitting ? "در حال انجام ..." : config.submit}</h2>
                    </button>
                </footer>
            </div>
        </section>
    );
};

export default CustomerModal;
