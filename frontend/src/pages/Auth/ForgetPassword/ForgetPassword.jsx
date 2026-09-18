import {useRef, useState} from "react";
import {useNavigate} from "react-router";
import toast from "react-hot-toast";
import {GrPhone} from "react-icons/gr";
import {FiKey} from "react-icons/fi";
import {authApi} from "../../../api/auth.js";
import {notify, notifyLoading} from "../../../lib/notify.jsx";
import {sanitizePhone} from "../../../lib/utils.js";
import {otpPhoneSchema} from "../../../validators/auth.js";
import {useInputTabLoop} from "../../../lib/useInputTabLoop.js";
import AuthBackdrop from "../components/AuthBackdrop.jsx";
import AuthHeader from "../components/AuthHeader.jsx";
import Field from "../components/Field.jsx";

const ForgetPassword = () => {
    // Tab فقط بینِ فیلدهای همین فرم می‌چرخد — همان قاعدهٔ فرمِ ورود
    const formRef = useRef(null);
    useInputTabLoop(formRef);

    const navigate = useNavigate();

    const [otpPhone, setOtpPhone] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef(null);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        const parsed = otpPhoneSchema.safeParse({otpPhone});
        if (!parsed.success) {
            const message = parsed.error.issues[0].message;
            setError(message);
            notify(message, "error");
            inputRef.current?.focus();
            return;
        }

        setSubmitting(true);
        const loadingId = notifyLoading("در حال ارسال رمز جدید ...");
        try {
            const res = await authApi.forgetPassword({otpPhone});
            toast.dismiss(loadingId);
            notify(res.message, "success", 3000);
            navigate("/auth/login", {replace: true});
        } catch (err) {
            toast.dismiss(loadingId);
            const data = err?.data || {};
            if (data.fieldErrors?.otpPhone) {
                setError(data.fieldErrors.otpPhone);
                notify(data.fieldErrors.otpPhone, "error");
                inputRef.current?.focus();
            } else {
                notify(data.message || "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید...", "error");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthBackdrop>
            <form ref={formRef} className="w-100 max-w-[calc(100vw-2rem)] rounded-3xl px-6 pt-6 pb-8 auth-card"
                  onSubmit={onSubmit} autoComplete="off">
                <AuthHeader title="فراموشی رمز عبور" onBack={() => navigate("/auth/login")}/>

                <main className="w-full mt-6">
                    <p className="text-sm leading-7 text-var-color-71 dark:text-var-color-70">
                        شماره همراه خود را وارد کنید. یک رمز عبور تازه برایتان پیامک می‌شود و
                        می‌توانید با آن وارد شوید.
                    </p>
                    <Field
                        className="mt-4"
                        label="شماره همراه"
                        icon={<GrPhone className="w-4 h-4"/>}
                        inputRef={inputRef}
                        value={otpPhone}
                        inputMode="numeric"
                        placeholder="شماره همراه خود را وارد کنید..."
                        error={error}
                        onChange={(e) => {
                            setOtpPhone(sanitizePhone(e.target.value));
                            setError("");
                        }}
                    />

                    <button type="submit" disabled={submitting}
                            className="w-full py-2.5 mt-6 rounded-xl auth-btn auth-btn-accent disabled:opacity-60 disabled:cursor-not-allowed">
                        <FiKey className="w-5 h-5 ml-2"/>
                        <span className="text-[17px]">{submitting ? "در حال ارسال ..." : "ارسال رمز جدید"}</span>
                    </button>
                </main>
            </form>
        </AuthBackdrop>
    );
};

export default ForgetPassword;
