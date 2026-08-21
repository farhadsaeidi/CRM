import {useEffect, useId, useState} from "react";
import toast from "react-hot-toast";
import {IoIosClose} from "react-icons/io";
import {FaRegUser} from "react-icons/fa6";
import {GrPhone} from "react-icons/gr";
import {FiTrash2, FiSave, FiUserPlus} from "react-icons/fi";
import {customersApi} from "../../../api/customers.js";
import {notify, notifyLoading} from "../../../lib/notify.jsx";
import {sanitizePhone} from "../../../lib/utils.js";
import {customerSchema} from "../../../validators/customer.js";

// یک مودال برای هر سه کار — ساخت، ویرایش و حذف. سه کامپوننت جدا یعنی سه نسخهٔ
// واگرا از همان فرم؛ در پروژهٔ قدیمی همین اتفاق افتاده بود.
const MODES = {
    create: {title: "ثبت مشتری جدید", submit: "ثبت", icon: FiUserPlus, danger: false},
    edit: {title: "ویرایش مشتری", submit: "ذخیره", icon: FiSave, danger: false},
    delete: {title: "حذف مشتری", submit: "حذف", icon: FiTrash2, danger: true},
};

const CustomerModal = ({mode, customer, onClose, onDone}) => {
    const id = useId();
    const config = MODES[mode] ?? MODES.create;
    const SubmitIcon = config.icon;

    // مقادیر مستقیم از پراپ‌ها مقداردهیِ اولیه می‌شوند و ریست‌شان با key در والد
    // انجام می‌گیرد، نه با افکت — ریست کردنِ state داخل افکت رندرِ آبشاری می‌سازد.
    const [fullname, setFullname] = useState(customer?.fullname ?? "");
    const [phone, setPhone] = useState(customer?.phone ?? "");
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // بستن با Escape
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const onSubmit = async (e) => {
        e.preventDefault();
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
        } finally {
            setSubmitting(false);
        }
    };

    const inputBase = "w-full h-full text-[15px] pr-8.5 pl-3 rounded-xl input input-bluish input-placeholder";

    return (
        // پس‌زمینهٔ تیره: کلیک رویش مودال را می‌بندد، ولی کلیک داخل فرم نه
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-var-color-11/50 p-4"
             onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <form
                onSubmit={onSubmit}
                autoComplete="off"
                className="w-96 max-w-full rounded-3xl px-6 pt-5 pb-6 form-container animate-modal-in shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)]"
            >
                <header className="flex items-center justify-between">
                    <h2 className="m-0 text-xl text-var-color-08 dark:text-var-color-01">{config.title}</h2>
                    <button type="button" onClick={onClose} aria-label="بستن"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-2xl text-var-color-05 dark:text-var-color-39 hover:text-var-color-28 cursor-pointer transition-colors duration-200">
                        <IoIosClose/>
                    </button>
                </header>

                {mode === "delete" ? (
                    <p className="mt-6 mb-2 text-[15px] leading-8 text-var-color-06 dark:text-var-color-03">
                        آیا از حذف مشتری «<span className="text-var-color-28">{customer?.fullname}</span>» مطمئن هستید؟
                        <br/>
                        تمام تراکنش‌های این مشتری هم حذف می‌شود و این کار بازگشت‌پذیر نیست.
                    </p>
                ) : (
                    <main className="mt-5">
                        <div className="w-full">
                            <label htmlFor={id + "fullname"} className="text-var-color-06 dark:text-var-color-03">
                                نام و نام خانوادگی
                            </label>
                            <div className="relative w-full h-10 mt-2">
                                <FaRegUser className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-15 pointer-events-none"/>
                                <input
                                    id={id + "fullname"}
                                    type="text"
                                    autoComplete="off"
                                    autoFocus
                                    value={fullname}
                                    placeholder="نام مشتری را وارد کنید..."
                                    onChange={(e) => {
                                        setFullname(e.target.value);
                                        setErrors((prev) => ({...prev, fullname: ""}));
                                    }}
                                    className={`${inputBase} ${errors.fullname ? "input-error" : ""}`}
                                />
                            </div>
                        </div>

                        <div className="w-full mt-5">
                            <label htmlFor={id + "phone"} className="text-var-color-06 dark:text-var-color-03">
                                شماره تماس
                            </label>
                            <div className="relative w-full h-10 mt-2">
                                <GrPhone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-15 pointer-events-none"/>
                                <input
                                    id={id + "phone"}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    value={phone}
                                    placeholder="شماره تماس را وارد کنید..."
                                    onChange={(e) => {
                                        setPhone(sanitizePhone(e.target.value));
                                        setErrors((prev) => ({...prev, phone: ""}));
                                    }}
                                    className={`${inputBase} ${errors.phone ? "input-error" : ""}`}
                                />
                            </div>
                        </div>
                    </main>
                )}

                <footer className="flex items-center gap-3 mt-7">
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`flex-1 py-2.5 rounded-xl btn disabled:opacity-60 disabled:cursor-not-allowed ${
                            config.danger
                                ? "border border-var-color-27 bg-var-color-26 text-var-color-28 enabled:hover:bg-var-color-28 enabled:hover:text-var-color-00 dark:enabled:hover:text-var-color-00"
                                : "btn-bluish"
                        }`}
                    >
                        <SubmitIcon className="w-4.5 h-4.5 ml-2"/>
                        <span className="text-[16px]">{submitting ? "در حال انجام ..." : config.submit}</span>
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl btn border border-var-color-02 dark:border-var-color-07 text-var-color-06 dark:text-var-color-03 hover:bg-var-color-01 dark:hover:bg-var-color-10 hover:text-var-color-06 dark:hover:text-var-color-03"
                    >
                        <span className="text-[16px]">انصراف</span>
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default CustomerModal;
