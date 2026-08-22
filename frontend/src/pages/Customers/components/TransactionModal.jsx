import {useEffect, useId, useRef, useState} from "react";
import toast from "react-hot-toast";
import {IoClose} from "react-icons/io5";
import {FiPlus} from "react-icons/fi";
import {GiPayMoney, GiReceiveMoney} from "react-icons/gi";
import {HiOutlinePencilSquare, HiOutlineTrash} from "react-icons/hi2";
import {transactionsApi} from "../../../api/transactions.js";
import {notify, notifyLoading} from "../../../lib/notify.jsx";
import {formatPersianNumber, numberToPersianWords, sanitizeAmount} from "../../../lib/numbers.js";
import {transactionSchema} from "../../../validators/transaction.js";

// همان الگوی CustomerModal: یک مودال برای هر سه کار با پراپ mode.
// رنگ‌بندی از CustomerManagement می‌آید — ثبتِ تراکنش سبز است (رنگِ کلِ این صفحه)،
// ویرایش کهربایی و حذف قرمز، دقیقاً مثل مودال‌های مشتری.
const MODES = {
    create: {
        title: "ثبت تراکنش جدید",
        submit: "ثبت تراکنش",
        icon: FiPlus,
        topBorder: "border-t-var-color-15!",
        badge: "text-var-color-01 dark:text-var-color-15 bg-var-color-15 dark:bg-var-color-12 border border-var-color-15 dark:border-var-color-42 rounded-full",
        badgeIcon: "w-8 h-8",
        button: "btn-bluish",
        submitIcon: "w-7 h-7 ml-0.5",
        input: "input-bluish",
        fieldIcon: "text-var-color-15",
    },
    edit: {
        title: "ویرایش تراکنش",
        submit: "ویرایش تراکنش",
        icon: HiOutlinePencilSquare,
        topBorder: "border-t-var-color-53!",
        badge: "text-var-color-53",
        badgeIcon: "w-7 h-7",
        button: "btn-yellowish",
        submitIcon: "w-4.5 h-4.5 mx-2",
        input: "input-yellowish",
        fieldIcon: "text-var-color-53",
    },
    delete: {
        title: "حذف تراکنش",
        submit: "حذف تراکنش",
        icon: IoClose,
        topBorder: "border-t-var-color-28!",
        badge: "text-var-color-01 dark:text-var-color-28 bg-var-color-28 dark:bg-var-color-26 border border-var-color-28 dark:border-var-color-27 rounded-full",
        badgeIcon: "w-8 h-8",
        button: "btn-redish",
        submitIcon: "w-5 h-5 mx-2",
        input: "input-error",
        fieldIcon: "text-var-color-28",
    },
};

const TransactionModal = ({mode, customerId, transaction, onClose, onDone}) => {
    const id = useId();
    const config = MODES[mode] ?? MODES.create;
    const BadgeIcon = config.icon;
    const SubmitIcon = config.icon;

    // ریست با key در والد انجام می‌شود، نه با افکت.
    // صفر خالی نشان داده می‌شود: ورودیِ خالی هم صفر فرستاده می‌شود، پس دادهٔ تراکنش
    // عوض نمی‌شود ولی «۰» و «صفر تومان» بی‌خود جلوی چشم نمی‌ماند.
    const initialAmount = (value) => (value ? sanitizeAmount(String(value)) : "");
    const [debt, setDebt] = useState(() => initialAmount(transaction?.debt));
    const [paid, setPaid] = useState(() => initialAmount(transaction?.paid));
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const inputsRef = useRef([]);
    const setInputRef = (index) => (el) => {
        inputsRef.current[index] = el;
    };

    const requestClose = () => {
        if (submitting) return;
        setIsClosing(true);
    };
    const handleAnimationEnd = () => {
        if (isClosing) onClose();
    };

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

        let payload = null;
        if (mode !== "delete") {
            const parsed = transactionSchema.safeParse({debt, paid});
            if (!parsed.success) {
                const issue = parsed.error.issues[0];
                setErrors({[issue.path[0]]: issue.message});
                notify(issue.message, "error");
                return;
            }
            payload = parsed.data;
        }

        setSubmitting(true);
        const loadingId = notifyLoading();
        try {
            let res;
            if (mode === "create") res = await transactionsApi.create(customerId, payload);
            else if (mode === "edit") res = await transactionsApi.update(customerId, transaction.id, payload);
            else res = await transactionsApi.remove(customerId, transaction.id);

            toast.dismiss(loadingId);
            notify(res?.message || "انجام شد.", "success", 2000);
            onDone(mode);
        } catch (err) {
            toast.dismiss(loadingId);
            const data = err?.data || {};
            const fieldKey = Object.keys(data).find((key) => Array.isArray(data[key]));
            if (fieldKey) {
                const message = data[fieldKey][0];
                // non_field_errors جای فیلدِ خاصی نیست؛ روی مبلغ نسیه می‌نشیند
                setErrors({[fieldKey === "non_field_errors" ? "debt" : fieldKey]: message});
                notify(message, "error");
            } else {
                notify(data.detail || data.message || "عملیات ناموفق بود. لطفاً دوباره تلاش کنید...", "error");
            }
            setSubmitting(false);
        }
    };

    const onInputKeyDown = (index, event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
            return;
        }
        // Delete فیلد را خالی می‌کند — همان میان‌بُرِ پروژهٔ قدیمی
        if (event.key === "Delete") {
            event.preventDefault();
            (index === 0 ? setDebt : setPaid)("");
        }
    };

    const inputClass = (hasError) =>
        `w-full h-full text-[15px] pr-8.5 rounded-xl input ${config.input} input-placeholder font-IRANSansXFaNumUltraLight ${
            hasError ? "input-error" : ""
        }`;

    // هر دو فیلد یک شکل‌اند؛ تفاوتشان فقط برچسب، آیکون و state است
    const amountField = ({index, name, label, placeholder, Icon, value, setValue}) => (
        <div className="w-full">
            <label className="text-var-color-06 dark:text-var-color-03" htmlFor={id + name}>{label}</label>
            <div className="relative w-full h-10 mt-2 rounded-xl">
                <Icon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 pointer-events-none ${config.fieldIcon}`}/>
                <input
                    id={id + name}
                    ref={setInputRef(index)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => {
                        setValue(sanitizeAmount(e.target.value));
                        setErrors((prev) => ({...prev, [name]: ""}));
                    }}
                    onKeyDown={(e) => onInputKeyDown(index, e)}
                    className={inputClass(errors[name])}
                />
            </div>
            {/* مبلغ به حروف — صفرِ اضافه را به چشم می‌آورد */}
            {value && (
                <div className="mt-1.5 mr-1 text-sm text-var-color-06 dark:text-var-color-03 opacity-90">
                    {numberToPersianWords(value)} تومان
                </div>
            )}
        </div>
    );

    return (
        <section
            onClick={requestClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/40 dark:backdrop-blur-lg"
        >
            <div
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
                            تراکنش انتخاب‌شده (نسیه {formatPersianNumber(transaction?.debt)} و پرداختی{" "}
                            {formatPersianNumber(transaction?.paid)} تومان) حذف می‌شود و مانده حساب مشتری دوباره
                            محاسبه می‌گردد. آیا اطمینان دارید؟
                        </p>
                    </main>
                ) : (
                    <main className="w-full mt-5">
                        {amountField({
                            index: 0, name: "debt", label: "مبلغ نسیه (تومان)", placeholder: "مبلغ نسیه...",
                            Icon: GiReceiveMoney, value: debt, setValue: setDebt,
                        })}
                        <div className="my-6">
                            {amountField({
                                index: 1, name: "paid", label: "مبلغ پرداختی (تومان)", placeholder: "مبلغ پرداختی...",
                                Icon: GiPayMoney, value: paid, setValue: setPaid,
                            })}
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

export default TransactionModal;
