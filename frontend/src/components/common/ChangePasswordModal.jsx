import {useId, useRef, useState} from "react";
import toast from "react-hot-toast";
import {IoIosClose} from "react-icons/io";
import {FiLock} from "react-icons/fi";
import {FaRegEye, FaRegEyeSlash} from "react-icons/fa6";
import {authApi} from "../../api/auth.js";
import {notify, notifyLoading} from "../../lib/notify.jsx";
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
            const data = err?.data || {};
            if (data.fieldErrors) {
                // خطای مربوط به یک فیلد مشخص (رمز قبلی یا رمز جدید)
                const field = Object.keys(data.fieldErrors)[0];
                const msg = data.fieldErrors[field];
                setErrors({[field]: msg});
                notify(msg, "error");
                focusField(field);
            } else {
                // خطای کلی سرور
                notify(data.message || "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید...", "error");
            }
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

    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="تغییر رمز عبور">
            {/* پس‌زمینه تیره */}
            <div className="absolute inset-0 bg-var-color-11/50 backdrop-blur-[2px]" onClick={resetAndClose}></div>
            {/* کارت مودال */}
            <form className="relative w-full max-w-100 rounded-[18px] bg-var-color-00 dark:bg-var-color-37 border border-var-color-02 dark:border-var-color-38 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] p-4 2xs:p-5 flex flex-col gap-3.5"
                  onSubmit={onSubmit} autoComplete="off">
                <div className="flex items-center justify-between">
                    <h3 className="m-0 text-[16px] font-IRANSansXFaNumDemiBold text-var-color-06 dark:text-var-color-01">تغییر رمز عبور</h3>
                    <button className="w-7 h-7 rounded-full flex items-center justify-center text-xl text-var-color-04 dark:text-var-color-39 hover:bg-var-color-01 dark:hover:bg-var-color-40 cursor-pointer" type="button" aria-label="بستن" onClick={resetAndClose}>
                        <IoIosClose/>
                    </button>
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

                {/* دکمه تغییر رمز عبور — هم‌استایلِ دکمهٔ مودالِ ثبت درخواست */}
                <button className="w-full h-10.5 rounded-[12px] btn btn-bluish cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={submitting}>
                    {submitting ? "در حال تغییر ..." : "تغییر رمز عبور"}
                </button>
            </form>
        </div>
    );
};

export default ChangePasswordModal;
