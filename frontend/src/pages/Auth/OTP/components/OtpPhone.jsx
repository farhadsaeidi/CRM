import {useRef, useState} from "react";
import {useNavigate} from "react-router";
import toast from "react-hot-toast";
import {GrPhone} from "react-icons/gr";
import {FiSend} from "react-icons/fi";
import {authApi} from "../../../../api/auth.js";
import {notify, notifyLoading} from "../../../../lib/notify.jsx";
import {sanitizePhone} from "../../../../lib/utils.js";
import {otpPhoneSchema} from "../../../../validators/auth.js";
import {useInputTabLoop} from "../../../../lib/useInputTabLoop.js";
import AuthHeader from "../../components/AuthHeader.jsx";
import Field from "../../components/Field.jsx";

const OtpPhone = ({active = true}) => {
    // Tab فقط بینِ فیلدهای همین فرم می‌چرخد — همان قاعدهٔ فرمِ ورود
    const formRef = useRef(null);
    useInputTabLoop(formRef, active);

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
        const loadingId = notifyLoading("در حال ارسال کد تایید ...");
        try {
            const res = await authApi.otpPhone({otpPhone});
            toast.dismiss(loadingId);
            notify(res.message, "success", 2500);
            navigate("/auth/otp/confirm", {state: {otpPhone}});
        } catch (err) {
            toast.dismiss(loadingId);
            const data = err?.data || {};
            if (data.fieldErrors?.otpPhone) {
                setError(data.fieldErrors.otpPhone);
                notify(data.fieldErrors.otpPhone, "error");
                inputRef.current?.focus();
            } else if (err?.status === 429) {
                // کد قبلی هنوز معتبر است — کاربر مستقیم به مرحلهٔ تایید می‌رود و
                // تایمر از همان ثانیه‌های باقی‌مانده ادامه پیدا می‌کند
                notify(data.message, "info", 3000);
                navigate("/auth/otp/confirm", {state: {otpPhone, remainingSeconds: data.remainingSeconds}});
            } else {
                notify(data.message || "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید...", "error");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form ref={formRef} className="w-100 max-w-[calc(100vw-2rem)] rounded-3xl px-6 pt-6 pb-8 auth-card"
              onSubmit={onSubmit} autoComplete="off" inert={!active}>
            <AuthHeader title="ورود با پیامک" onBack={() => navigate("/auth/login")}/>

            <main className="w-full mt-6">
                <p className="text-sm leading-7 text-var-color-71 dark:text-var-color-70">
                    شماره همراه خود را وارد کنید تا کد تایید برایتان ارسال شود.
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
                    <FiSend className="w-5 h-5 ml-2"/>
                    <span className="text-[17px]">{submitting ? "در حال ارسال ..." : "ارسال کد تایید"}</span>
                </button>
            </main>
        </form>
    );
};

export default OtpPhone;
