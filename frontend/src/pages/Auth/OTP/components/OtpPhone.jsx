import {useId, useRef, useState} from "react";
import {useNavigate} from "react-router";
import toast from "react-hot-toast";
import {GrPhone} from "react-icons/gr";
import {HiOutlineArrowRight} from "react-icons/hi";
import {FiSend} from "react-icons/fi";
import {authApi} from "../../../../api/auth.js";
import ThemeSwitcher from "../../../../components/common/ThemeSwitcher.jsx";
import {notify, notifyLoading} from "../../../../lib/notify.jsx";
import {sanitizePhone} from "../../../../lib/utils.js";
import {otpPhoneSchema} from "../../../../validators/auth.js";

const OtpPhone = ({active = true}) => {
    const navigate = useNavigate();
    const id = useId();

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
        <form className="w-100 h-84 rounded-3xl px-6 pt-6 pb-8 form-container" onSubmit={onSubmit} autoComplete="off" inert={!active}>
            <header className="w-full py-3 flex flex-row justify-between items-center">
                {/* در RTL آیکونِ بازگشت رو به راست است، نه چپ */}
                <button type="button" onClick={() => navigate("/auth/login")}
                        className="grid h-8 w-8 place-items-center rounded-lg cursor-pointer text-var-color-06 hover:text-var-color-08 dark:text-var-color-03 dark:hover:text-var-color-04">
                    <HiOutlineArrowRight className="h-6 w-6"/>
                </button>
                <h2 className="text-var-color-08 dark:text-var-color-01 text-2xl text-center">ورود با پیامک</h2>
                <ThemeSwitcher/>
            </header>

            <main className="w-full mt-6">
                <p className="text-sm leading-7 text-var-color-05 dark:text-var-color-04">
                    شماره همراه خود را وارد کنید تا کد تایید برایتان ارسال شود.
                </p>
                <div className="w-full mt-4">
                    <label htmlFor={id + "otpPhone"} className="text-var-color-06 dark:text-var-color-03">شماره همراه</label>
                    <div className="relative w-full h-10 mt-2">
                        <GrPhone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-15 pointer-events-none"/>
                        <input
                            id={id + "otpPhone"}
                            ref={inputRef}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={otpPhone}
                            placeholder="شماره همراه خود را وارد کنید..."
                            onChange={(e) => {
                                setOtpPhone(sanitizePhone(e.target.value));
                                setError("");
                            }}
                            className={`w-full h-full text-[15px] pr-8.5 pl-3 rounded-xl input input-bluish input-placeholder ${error ? "input-error" : ""}`}
                        />
                    </div>
                </div>

                <button type="submit" disabled={submitting}
                        className="w-full py-2.5 mt-6 rounded-xl btn btn-bluish disabled:opacity-60 disabled:cursor-not-allowed">
                    <FiSend className="w-5 h-5 ml-2"/>
                    <span className="text-[17px]">{submitting ? "در حال ارسال ..." : "ارسال کد تایید"}</span>
                </button>
            </main>
        </form>
    );
};

export default OtpPhone;
