import {useRef, useState} from "react";
import {useNavigate} from "react-router";
import toast from "react-hot-toast";
import {GrPhone} from "react-icons/gr";
import {FiLogIn} from "react-icons/fi";
import {IoMdLock} from "react-icons/io";
import {HiOutlineDevicePhoneMobile} from "react-icons/hi2";
import {FcGoogle} from "react-icons/fc";
import {useAuth} from "../../../../context/AuthContext.js";
import {authApi} from "../../../../api/auth.js";
import {notify, notifyLoading} from "../../../../lib/notify.jsx";
import {sanitizePhone} from "../../../../lib/utils.js";
import {loginSchema} from "../../../../validators/auth.js";
import {useInputTabLoop} from "../../../../lib/useInputTabLoop.js";
import AuthHeader from "../../components/AuthHeader.jsx";
import EyeButton from "../../components/EyeButton.jsx";
import Field from "../../components/Field.jsx";

const FIELD_INDEX = {username: 0, password: 1};

/** ورود — آبی. ظاهرش عیناً صفحهٔ ورودِ HMS است؛ قرینه‌اش `Register` با صورتی. */
const Login = ({active = true}) => {
    // Tab فقط بینِ فیلدها می‌چرخد؛ دکمه‌های ناوبریِ همین فرم از چرخه
    // بیرون‌اند. `active` هم پاس می‌شود تا فرمِ پنهان لیسنر نگذارد.
    const formRef = useRef(null);
    useInputTabLoop(formRef, active);

    const {setUser} = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const inputsRef = useRef([]);
    const setInputRef = (index) => (el) => {
        // eslint-disable-next-line react-hooks/refs
        inputsRef.current[index] = el;
    };
    const focusField = (field) => inputsRef.current[FIELD_INDEX[field]]?.focus();

    const onUsernameChange = (e) => {
        setUsername(sanitizePhone(e.target.value));
        setErrors((prev) => ({...prev, username: ""}));
    };

    const onPasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        // وقتی فیلد خالی شد، چشمِ باز بماند بی‌معناست
        if (value.length === 0) setShowPassword(false);
        setErrors((prev) => ({...prev, password: ""}));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        // اعتبارسنجی سمت کلاینت — بازخورد فوری بدون رفت‌وبرگشت شبکه
        const parsed = loginSchema.safeParse({username, password});
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            const field = issue.path[0];
            setErrors({[field]: issue.message});
            notify(issue.message, "error");
            focusField(field);
            return;
        }

        setSubmitting(true);
        const loadingId = notifyLoading();
        try {
            const res = await authApi.login({username, password});
            toast.dismiss(loadingId);
            notify(res.message, "success", 2000);
            setUser(res.userData);
            navigate("/home", {replace: true});
        } catch (err) {
            toast.dismiss(loadingId);
            const data = err?.data || {};
            if (data.fieldErrors) {
                // سرور نام فیلد را همان‌طور برمی‌گرداند که اینجا استفاده می‌شود
                const field = Object.keys(data.fieldErrors)[0];
                const message = data.fieldErrors[field];
                setErrors({[field]: message});
                notify(message, "error");
                focusField(field);
            } else {
                notify(data.message || "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید...", "error");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form ref={formRef} className="w-100 h-160 rounded-3xl px-6 pt-6 pb-8 auth-card flex flex-col"
              onSubmit={onSubmit} autoComplete="off" inert={!active}>
            <AuthHeader title="ورود به سیستم"/>

            {/* `flex-1` و `justify-center` جای فاصلهٔ ثابتِ بالا را گرفته‌اند:
                فضای اضافهٔ کارتِ ثابت‌قد بالا و پایینِ گروه پخش می‌شود. */}
            <main className="w-full flex-1 flex flex-col justify-center">
                <Field
                    label="نام کاربری (شماره همراه)"
                    icon={<GrPhone className="w-4 h-4"/>}
                    inputRef={setInputRef(0)}
                    value={username}
                    inputMode="numeric"
                    placeholder="شماره همراه خود را وارد کنید..."
                    error={errors.username}
                    onChange={onUsernameChange}
                />

                <Field
                    className="my-6"
                    label="رمز عبور"
                    icon={<IoMdLock className="w-4 h-4"/>}
                    inputRef={setInputRef(1)}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="new-password"
                    placeholder="رمز عبور خود را وارد کنید..."
                    error={errors.password}
                    trailing={
                        <EyeButton shown={showPassword} disabled={password.length === 0}
                                   onToggle={() => setShowPassword((s) => !s)}/>
                    }
                    onChange={onPasswordChange}
                />

                <button type="submit" disabled={submitting}
                        className="w-full py-2.5 rounded-xl auth-btn auth-btn-accent disabled:opacity-60 disabled:cursor-not-allowed">
                    <FiLogIn className="w-5 h-5 ml-2 rotate-180"/>
                    <span className="text-[17px]">{submitting ? "در حال ورود ..." : "ورود"}</span>
                </button>

                <div className="w-full flex flex-row items-center my-2.5">
                    <hr className="border-var-color-68 dark:border-var-color-72 w-1/2"/>
                    <p className="text-base m-0 mx-1 text-var-color-70 cursor-default">یا</p>
                    <hr className="border-var-color-68 dark:border-var-color-72 w-1/2"/>
                </div>

                <button type="button" className="w-full py-2.5 rounded-xl auth-btn auth-btn-accent"
                        onClick={() => navigate("/auth/otp/phone")}>
                    <HiOutlineDevicePhoneMobile className="w-6 h-6 ml-2"/>
                    <span className="text-[17px]">ورود با پیامک</span>
                </button>

                {/* ورود با حساب گوگل — اتصال واقعی بعداً اضافه می‌شود.
                    آیکون رنگی است و روی هاورِ دکمه (group) رنگ داخلی SVG به رنگ متن
                    درمی‌آید؛ قاعده‌اش کلاس google-icon در index.css است. بوردرِ
                    رنگینِ تمِ تیره هم از `auth-edge-gradient` می‌آید. */}
                <button type="button"
                        className="group w-full py-2.5 mt-2.5 rounded-xl auth-btn auth-btn-accent auth-edge-gradient"
                        onClick={() => notify("ورود با حساب گوگل به‌زودی فعال می‌شود.", "info")}>
                    <FcGoogle className="google-icon w-5.5 h-5.5 ml-2"/>
                    <span className="text-[17px]">ورود با حساب گوگل</span>
                </button>
            </main>

            <footer className="flex flex-col justify-center items-center gap-1.5 mt-6">
                <div className="flex items-center">
                    <p className="m-0 text-var-color-71 dark:text-var-color-70 text-base cursor-default">حساب کاربری ندارم.</p>
                    {/* رنگِ این لینک **صورتی** است — رنگِ فرمی که به آن می‌برد.
                        همان قراردادِ HMS: لینکِ متقابل رنگِ مقصد را می‌گیرد. */}
                    <button type="button" onClick={() => navigate("/auth/register")}
                            className="mx-1 text-var-color-77 dark:text-var-color-78 text-base cursor-pointer hover:underline underline-offset-7 bg-transparent border-none p-0">
                        ثبت نام
                    </button>
                </div>
                {/* متنِ اکسنت روی کارت: تیره‌ترِ آبی در لایت، روشن‌ترش در دارک */}
                <button type="button" onClick={() => navigate("/auth/forget-password")}
                        className="text-var-color-19 dark:text-var-color-76 text-[16px] text-center hover:underline underline-offset-7 bg-transparent border-none cursor-pointer p-0">
                    فراموشی رمز عبور
                </button>
            </footer>
        </form>
    );
};

export default Login;
