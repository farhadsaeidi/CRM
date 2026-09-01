import {useEffect, useRef, useState} from "react";
import {useLocation, useNavigate} from "react-router";
import toast from "react-hot-toast";
import {HiOutlineArrowRight} from "react-icons/hi";
import {FiCheck, FiClock, FiRefreshCw} from "react-icons/fi";
import {useAuth} from "../../../../context/AuthContext.js";
import {authApi} from "../../../../api/auth.js";
import ThemeSwitcher from "../../../../components/common/ThemeSwitcher.jsx";
import {notify, notifyLoading} from "../../../../lib/notify.jsx";
import {toEnglishDigits} from "../../../../lib/utils.js";
import {otpConfirmSchema} from "../../../../validators/auth.js";
import {useInputTabLoop} from "../../../../lib/useInputTabLoop.js";

const OTP_LENGTH = 5;
const OTP_EXPIRES_SECONDS = 120;

const formatTimer = (totalSeconds) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
};

const OtpConfirm = ({active = false}) => {
    // Tab فقط بینِ فیلدهای همین فرم می‌چرخد — همان قاعدهٔ فرمِ ورود
    const formRef = useRef(null);
    useInputTabLoop(formRef, active);

    const {setUser} = useAuth();
    const navigate = useNavigate();
    const {state} = useLocation();

    // شماره از مرحلهٔ قبل با state ناوبری می‌آید — نه از یوآرال، تا در تاریخچه نماند
    const otpPhone = state?.otpPhone ?? "";
    const [digits, setDigits] = useState(() => Array(OTP_LENGTH).fill(""));
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(state?.remainingSeconds ?? OTP_EXPIRES_SECONDS);
    const expired = remainingSeconds <= 0;

    const inputsRef = useRef([]);
    const setInputRef = (index) => (el) => {
        inputsRef.current[index] = el;
    };

    // رسیدن به این مرحله بدون شماره (رفرش یا آدرس مستقیم) بی‌معناست
    useEffect(() => {
        if (active && !otpPhone) navigate("/auth/otp/phone", {replace: true});
    }, [active, otpPhone, navigate]);

    useEffect(() => {
        if (!active) return;
        const timer = setTimeout(() => inputsRef.current[0]?.focus(), 50);
        return () => clearTimeout(timer);
    }, [active]);

    // شمارش معکوس اعتبار کد
    useEffect(() => {
        if (!active || remainingSeconds <= 0) return;
        const timer = setInterval(() => {
            setRemainingSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [active, remainingSeconds]);

    const writeDigit = (index, rawValue) => {
        const digit = toEnglishDigits(rawValue).replace(/\D/g, "").slice(-1);
        if (!digit) return;
        setDigits((prev) => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });
        setError("");
        if (index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
    };

    // چسباندن کل کد در هر خانه، بین خانه‌ها پخش می‌شود
    const onPaste = (index, event) => {
        event.preventDefault();
        const pasted = toEnglishDigits(event.clipboardData.getData("text")).replace(/\D/g, "");
        if (!pasted) return;
        setDigits((prev) => {
            const next = [...prev];
            let cursor = index;
            for (const digit of pasted) {
                if (cursor >= OTP_LENGTH) break;
                next[cursor] = digit;
                cursor += 1;
            }
            return next;
        });
        setError("");
        inputsRef.current[Math.min(index + pasted.length, OTP_LENGTH - 1)]?.focus();
    };

    const onKeyDown = (index, event) => {
        if (event.key === "Backspace") {
            event.preventDefault();
            setDigits((prev) => {
                const next = [...prev];
                // خانهٔ پر پاک می‌شود؛ خانهٔ خالی یعنی برو عقب
                if (next[index]) next[index] = "";
                else if (index > 0) {
                    next[index - 1] = "";
                    inputsRef.current[index - 1]?.focus();
                }
                return next;
            });
        } else if (event.key === "ArrowRight" && index > 0) {
            // در RTL راست یعنی خانهٔ قبلی
            inputsRef.current[index - 1]?.focus();
        } else if (event.key === "ArrowLeft" && index < OTP_LENGTH - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const resend = async () => {
        const loadingId = notifyLoading("در حال ارسال کد تازه ...");
        try {
            const res = await authApi.otpPhone({otpPhone});
            toast.dismiss(loadingId);
            notify(res.message, "success", 2500);
            setDigits(Array(OTP_LENGTH).fill(""));
            setRemainingSeconds(OTP_EXPIRES_SECONDS);
            inputsRef.current[0]?.focus();
        } catch (err) {
            toast.dismiss(loadingId);
            const data = err?.data || {};
            if (err?.status === 429 && data.remainingSeconds) setRemainingSeconds(data.remainingSeconds);
            notify(data.message || "ارسال دوبارهٔ کد ناموفق بود.", "error");
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        const otpConfirm = digits.join("");
        const parsed = otpConfirmSchema.safeParse({otpConfirm});
        if (!parsed.success) {
            const message = parsed.error.issues[0].message;
            setError(message);
            notify(message, "error");
            return;
        }

        setSubmitting(true);
        const loadingId = notifyLoading();
        try {
            const res = await authApi.otpConfirm({otpPhone, otpConfirm});
            toast.dismiss(loadingId);
            notify(res.message, "success", 2000);
            setUser(res.userData);
            navigate("/home", {replace: true});
        } catch (err) {
            toast.dismiss(loadingId);
            const data = err?.data || {};
            const message = data.fieldErrors?.otpConfirm || data.fieldErrors?.otpPhone || data.message;
            setError(message || "");
            notify(message || "ارتباط با سرور برقرار نشد.", "error");
            // کدِ سوخته یا منقضی: خانه‌ها پاک شوند تا کاربر کدِ تازه را تایپ کند
            if (err?.status === 429 || data.fieldErrors?.otpConfirm?.includes("پایان")) {
                setDigits(Array(OTP_LENGTH).fill(""));
                setRemainingSeconds(0);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form ref={formRef} className="w-100 h-84 rounded-3xl px-6 pt-6 pb-8 form-container"
              onSubmit={onSubmit} autoComplete="off" inert={!active}>
            <header className="w-full mb-5 flex flex-row justify-between items-center">
                <button type="button" tabIndex={-1} aria-label="بازگشت" onClick={() => navigate("/auth/otp/phone", {replace: true})}
                        className="grid h-8 w-8 place-items-center rounded-full cursor-pointer bg-transparent transition-all duration-200 ease-in-out text-var-color-06 hover:text-var-color-08 dark:text-var-color-03 dark:hover:text-var-color-03 hover:bg-var-color-01 dark:hover:bg-var-color-65">
                    <HiOutlineArrowRight className="h-6 w-6"/>
                </button>
                <h2 className="text-var-color-08 dark:text-var-color-01 text-2xl text-center">کد تایید</h2>
                <ThemeSwitcher/>
            </header>

            <main className="w-full">
                {/* وسط‌چین و هم‌رنگِ SAM. شماره در `dir=ltr` می‌نشیند وگرنه در
                    جملهٔ فارسی وارونه خوانده می‌شود. */}
                <p className="w-full m-0 text-center text-var-color-06 dark:text-var-color-03">
                    کد تایید به شماره <span dir="ltr">{otpPhone}</span> ارسال شد.
                </p>

                {/* خانه‌ها با dir=ltr چیده می‌شوند تا اولین رقم سمت چپ بنشیند، مثل خودِ عدد */}
                <div className="flex flex-row justify-center items-center gap-2 mt-2" dir="ltr">
                    {digits.map((digit, index) => (
                        <input
                            key={index}
                            ref={setInputRef(index)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            autoComplete="off"
                            value={digit}
                            onChange={(e) => writeDigit(index, e.target.value)}
                            onPaste={(e) => onPaste(index, e)}
                            onKeyDown={(e) => onKeyDown(index, e)}
                            className={`w-10 h-10 text-center text-base rounded-xl input input-bluish ${error ? "input-error" : ""}`}
                        />
                    ))}
                </div>

                {/* «زمان باقیمانده:» برچسب دارد، مثل SAM — عددِ تنها نمی‌گوید
                    چه چیزی دارد می‌شمارد. حالتِ پایانِ اعتبار مالِ CRM است و
                    می‌ماند: بدونش کاربر نمی‌فهمد چرا دکمهٔ تایید خاموش شد. */}
                <div className="w-full flex flex-row justify-center items-center mt-5">
                    <FiClock className={`w-5 h-5 ml-1 ${expired ? "text-var-color-28" : "text-var-color-15"}`}/>
                    {expired ? (
                        <p className="m-0 ml-2 text-var-color-28 text-[14px]">اعتبار کد به پایان رسید</p>
                    ) : (
                        <>
                            <p className="m-0 ml-2 text-var-color-06 dark:text-var-color-03 text-[14px]">زمان باقیمانده:</p>
                            <p className="m-0 text-var-color-15 text-[15px]" dir="ltr">{formatTimer(remainingSeconds)}</p>
                        </>
                    )}
                </div>

                {/* آیکون بیرونِ دکمه است، مثل SAM: خودِ آیکون کلیک‌پذیر نیست و
                    وقتی ارسالِ دوباره خاموش است هم رنگش عوض نمی‌شود. */}
                <div className="w-full flex flex-row justify-center items-center mt-3">
                    <FiRefreshCw className="w-4.5 h-4.5 ml-1.25 text-var-color-15"/>
                    <button type="button" tabIndex={-1} onClick={resend} disabled={!expired}
                            className={`m-0 ml-2 text-[14px] bg-transparent border-none p-0 transition-all duration-200 ease-in-out ${expired
                                ? "text-var-color-06 hover:text-var-color-11 dark:text-var-color-03 dark:hover:text-var-color-00 cursor-pointer"
                                : "text-var-color-04 dark:text-var-color-05 cursor-not-allowed"}`}>
                        ارسال دوبارهٔ کد
                    </button>
                </div>
            </main>

            {/* دکمهٔ اصلی در فوترِ خودش، مثل SAM — از بدنه جدا می‌شود و فاصلهٔ
                بیشتری می‌گیرد. */}
            <footer className="w-full mt-5 mb-1">
                <button type="submit" tabIndex={-1} disabled={submitting || expired}
                        className="w-full flex items-center justify-center py-2.5 rounded-xl btn btn-bluish disabled:opacity-60 disabled:cursor-not-allowed">
                    <FiCheck className="w-5 h-5 ml-2"/>
                    <h2 className="m-0 text-[17px]">{submitting ? "در حال بررسی ..." : "تایید و ورود"}</h2>
                </button>
            </footer>
        </form>
    );
};

export default OtpConfirm;
