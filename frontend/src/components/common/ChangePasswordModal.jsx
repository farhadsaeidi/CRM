import {useId, useRef, useState} from "react";
import toast from "react-hot-toast";
import ModalCloseButton from "./ModalCloseButton.jsx";
// ✕ِ داخلِ دکمهٔ «انصراف» فوتر — دکمهٔ گوشهٔ هدر ✕ خودش را از ModalCloseButton دارد
import {IoClose} from "react-icons/io5";
import {FiLock} from "react-icons/fi";
import {FaRegEye, FaRegEyeSlash} from "react-icons/fa6";
import {authApi} from "../../api/auth.js";
import {notify, notifyLoading} from "../../lib/notify.jsx";
import {errorMessage, fieldErrorsOf} from "../../lib/apiError.js";
import {changePasswordSchema} from "../../validators/auth.js";

// فیلدهای مودال (ترتیبِ فوکوس/تب = ترتیبِ همین آرایه)
const FIELDS = [
    {name: "old_password", label: "رمز قبلی", placeholder: "رمز قبلی خود را وارد کنید..."},
    {name: "new_password", label: "رمز جدید", placeholder: "رمز جدید خود را وارد کنید..."},
    {name: "repeat_password", label: "تکرار رمز جدید", placeholder: "رمز جدید را دوباره وارد کنید..."},
];

// مودال تغییر رمز عبور — از منوی استارت باز می‌شود؛ خطاها با toast + قرمزیِ اینپوت (هم‌سبکِ بقیهٔ مودال‌ها)
const ChangePasswordModal = ({open, onClose}) => {
    const id = useId();
    const [values, setValues] = useState({old_password: "", new_password: "", repeat_password: ""});
    const [show, setShow] = useState({old_password: false, new_password: false, repeat_password: false});
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const inputsRef = useRef({});

    if (!open) return null;

    const setValue = (name, value) => {
        setValues((prev) => ({...prev, [name]: value}));
        setErrors((prev) => ({...prev, [name]: ""}));
        if (value.length === 0) setShow((prev) => ({...prev, [name]: false}));
    };

    const resetAndClose = () => {
        setValues({old_password: "", new_password: "", repeat_password: ""});
        setShow({old_password: false, new_password: false, repeat_password: false});
        setErrors({});
        onClose();
    };

    // بستن با انیمیشن — همان الگوی مودال‌های مشتری و تراکنش: کلاسِ خروج می‌نشیند
    // و بعدِ پایانِ انیمیشن مودال برداشته می‌شود.
    const requestClose = () => {
        if (submitting) return;
        setIsClosing(true);
    };
    const handleAnimationEnd = () => {
        // انیمیشنِ ورود هم همین را صدا می‌زند، پس فقط حالتِ خروج شمرده می‌شود
        if (!isClosing) return;
        setIsClosing(false);
        resetAndClose();
    };

    const submit = async () => {
        if (submitting) return;
        // اعتبارسنجی سمت کلاینت
        const parsed = changePasswordSchema.safeParse(values);
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const field = issue.path[0];
            setErrors({[field]: issue.message});
            notify(issue.message, "error");
            // فوکوس روی فیلد خطادار
            focusField(field);
            return;
        }
        // اعتبارسنجی سمت سرور (تطبیقِ رمز قبلی با رمزِ فعلیِ حساب)
        setSubmitting(true);
        const loadingId = notifyLoading("در حال پردازش اطلاعات ...");
        try {
            await authApi.changePassword({old_password: parsed.data.old_password, new_password: parsed.data.new_password});
            toast.dismiss(loadingId);
            notify("تغییر رمز با موفقیت انجام شد.", "success");
            resetAndClose();
        } catch (err) {
            // err ---> تشخیص ارور به کمک استاتوسی که از سمت سرور میاد انجام میشه
            toast.dismiss(loadingId);
            // خطای فیلد و خطای کلی، هر دو از یک جا خوانده می‌شوند
            const fields = fieldErrorsOf(err);
            const [field] = Object.keys(fields);
            const message = errorMessage(err, "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید...");
            if (field) {
                setErrors({[field]: fields[field]});
                focusField(field);
            }
            notify(message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        await submit();
    };

    const focusField = (fieldName) => {
        inputsRef.current[fieldName]?.focus();
    };

    // پس‌زمینهٔ بلوری و انیمیشنِ ورود/خروج عیناً مثل بقیهٔ مودال‌ها
    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm dark:bg-black/40 dark:backdrop-blur-lg"
             onClick={requestClose} role="dialog" aria-modal="true" aria-label="تغییر رمز عبور">
            <form className={`relative w-full max-w-100 rounded-[18px] bg-var-color-00 dark:bg-var-color-37 border border-var-color-02 dark:border-var-color-38 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] p-4 2xs:p-5 flex flex-col gap-3.5 ${
                      isClosing ? "animate-modal-out" : "animate-modal-in"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                  onAnimationEnd={handleAnimationEnd}
                  onSubmit={onSubmit} autoComplete="off">
                <div className="flex items-center justify-between">
                    {/* آیکون، بعد عنوان — همان چیدمانِ هدرِ بقیهٔ مودال‌ها */}
                    <div className="flex flex-row justify-start items-center gap-2">
                        <span className="w-7 h-7 shrink-0 flex justify-center items-center rounded-full text-var-color-01 dark:text-var-color-15 bg-var-color-15 dark:bg-var-color-12 border border-var-color-15 dark:border-var-color-42">
                            <FiLock className="w-3.5 h-3.5"/>
                        </span>
                        <h3 className="m-0 text-[16px] font-IRANSansXFaNumDemiBold text-var-color-06 dark:text-var-color-01">تغییر رمز عبور</h3>
                    </div>
                    <ModalCloseButton size="sm" onClick={requestClose}/>
                </div>

                {FIELDS.map((f) => (
                    <div key={f.name} className="flex flex-col gap-1.5">
                        <label className="text-[13px] text-var-color-05 dark:text-var-color-39" htmlFor={id + f.name}>{f.label}</label>
                        <div className="relative w-full h-10">
                            <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-15 pointer-events-none"/>
                            <input
                                id={id + f.name}
                                ref={(el) => { inputsRef.current[f.name] = el; }}
                                type={show[f.name] ? "text" : "password"}
                                autoComplete="new-password"
                                value={values[f.name]}
                                placeholder={f.placeholder}
                                onChange={(e) => setValue(f.name, e.target.value)}
                                className={`w-full h-full text-[15px] pr-8.5 pl-10 rounded-xl input input-bluish ${errors[f.name] ? "input-error" : ""}`}
                            />
                            <button className="absolute top-1/2 left-3 -translate-y-1/2 disabled:text-var-color-04 dark:disabled:text-var-color-05 enabled:text-var-color-06 dark:enabled:text-var-color-03 enabled:cursor-pointer"
                                type="button" tabIndex={-1}
                                onClick={() => setShow((prev) => ({...prev, [f.name]: !prev[f.name]}))}
                                disabled={values[f.name].length === 0}>
                                {show[f.name] ? <FaRegEyeSlash/> : <FaRegEye/>}
                            </button>
                        </div>
                    </div>
                ))}

                {/* نوارِ دکمه‌ها — همان چیدمانِ بقیهٔ مودال‌ها و پنلِ جستجو: انصراف و
                    اقدام کنار هم، هرکدام نصفِ عرض. اینجا از ModalActions استفاده
                    نمی‌شود چون این یکی فرم است و دکمه‌اش باید type="submit" بماند. */}
                <footer className="flex flex-row justify-between items-center gap-2 mt-1">
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={requestClose}
                        className="w-1/2 h-10 rounded-xl btn btn-redish disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <IoClose className="w-5 h-5 ml-1"/>
                        <span className="text-[15px]">انصراف</span>
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-1/2 h-10 rounded-xl btn btn-bluish disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <FiLock className="w-4.5 h-4.5 ml-1.5"/>
                        <span className="text-[15px]">{submitting ? "در حال تغییر ..." : "تغییر رمز عبور"}</span>
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default ChangePasswordModal;
