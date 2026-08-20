import {useId, useRef, useState} from "react";
import {useNavigate} from "react-router";
import toast from "react-hot-toast";
import {GrPhone} from "react-icons/gr";
import {FaRegEye, FaRegEyeSlash} from "react-icons/fa6";
import {FiLock, FiLogIn} from "react-icons/fi";
import {HiOutlineDevicePhoneMobile} from "react-icons/hi2";
import {FcGoogle} from "react-icons/fc";
import {useAuth} from "../../../../context/AuthContext.js";
import {authApi} from "../../../../api/auth.js";
import ThemeSwitcher from "../../../../components/common/ThemeSwitcher.jsx";
import {notify, notifyLoading} from "../../../../lib/notify.jsx";
import {sanitizePhone} from "../../../../lib/utils.js";
import {loginSchema} from "../../../../validators/auth.js";

const FIELD_INDEX = {username: 0, password: 1};

const Login = ({active = true}) => {
    const {setUser} = useAuth();
    const navigate = useNavigate();
    const id = useId();

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
            navigate("/customers", {replace: true});
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
        <form className="w-100 h-150 rounded-3xl px-6 pt-6 pb-8 form-container" onSubmit={onSubmit} autoComplete="off" inert={!active}>
            <header className="w-full py-3 flex flex-row justify-between items-center">
                <div className="w-8 h-8"/>
                <h2 className="text-var-color-08 dark:text-var-color-01 text-2xl text-center">ورود به سیستم</h2>
                <ThemeSwitcher/>
            </header>

            <main className="w-full mt-5">
                {/* شماره همراه */}
                <div className="w-full">
                    <label htmlFor={id + "username"} className="text-var-color-06 dark:text-var-color-03">
                        نام کاربری (شماره همراه)
                    </label>
                    <div className="relative w-full h-10 mt-2">
                        <GrPhone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-15 pointer-events-none"/>
                        <input
                            id={id + "username"}
                            ref={setInputRef(0)}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={username}
                            placeholder="شماره همراه خود را وارد کنید..."
                            onChange={onUsernameChange}
                            className={`w-full h-full text-[15px] pr-8.5 pl-3 rounded-xl input input-bluish input-placeholder ${errors.username ? "input-error" : ""}`}
                        />
                    </div>
                </div>

                {/* رمز عبور */}
                <div className="w-full my-6">
                    <label htmlFor={id + "password"} className="text-var-color-06 dark:text-var-color-03">رمز عبور</label>
                    <div className="relative w-full h-10 mt-2">
                        <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-15 pointer-events-none"/>
                        <input
                            id={id + "password"}
                            ref={setInputRef(1)}
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={password}
                            placeholder="رمز عبور خود را وارد کنید..."
                            onChange={onPasswordChange}
                            className={`w-full h-full text-[15px] pr-8.5 pl-10 rounded-xl input input-bluish input-placeholder ${errors.password ? "input-error" : ""}`}
                        />
                        {/* enabled: لازم است چون هاور روی دکمهٔ disabled هم اعمال می‌شود */}
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((s) => !s)}
                            disabled={password.length === 0}
                            className="absolute top-1/2 left-3 -translate-y-1/2 disabled:text-var-color-04 dark:disabled:text-var-color-05 enabled:text-var-color-06 dark:enabled:text-var-color-03 enabled:cursor-pointer"
                        >
                            {showPassword ? <FaRegEyeSlash/> : <FaRegEye/>}
                        </button>
                    </div>
                </div>

                <button type="submit" disabled={submitting}
                        className="w-full py-2.5 rounded-xl btn btn-bluish disabled:opacity-60 disabled:cursor-not-allowed">
                    <FiLogIn className="w-5 h-5 ml-2 rotate-180"/>
                    <span className="text-[17px]">{submitting ? "در حال ورود ..." : "ورود"}</span>
                </button>

                <div className="w-full flex flex-row items-center my-2.5">
                    <hr className="border-var-color-02 dark:border-var-color-07 w-1/2"/>
                    <p className="text-base m-0 mx-1 text-var-color-04 dark:text-var-color-05 cursor-default">یا</p>
                    <hr className="border-var-color-02 dark:border-var-color-07 w-1/2"/>
                </div>

                <button type="button" className="w-full py-2.5 rounded-xl btn btn-bluish"
                        onClick={() => navigate("/auth/otp/phone")}>
                    <HiOutlineDevicePhoneMobile className="w-6 h-6 ml-2"/>
                    <span className="text-[17px]">ورود با پیامک</span>
                </button>

                {/* ورود با حساب گوگل — اتصال واقعی بعداً اضافه می‌شود.
                    آیکون رنگی است و روی هاورِ دکمه (group) رنگ داخلی SVG به رنگ متن
                    درمی‌آید؛ قاعده‌اش کلاس google-icon در index.css است. */}
                <button type="button" className="group w-full py-2.5 mt-2.5 rounded-xl btn btn-bluish"
                        onClick={() => notify("ورود با حساب گوگل به‌زودی فعال می‌شود.", "info")}>
                    <FcGoogle className="google-icon w-5.5 h-5.5 ml-2"/>
                    <span className="text-[17px]">ورود با حساب گوگل</span>
                </button>
            </main>

            <footer className="flex flex-col justify-center items-center gap-1.5 mt-6">
                <div className="flex items-center">
                    <p className="m-0 text-var-color-06 dark:text-var-color-03 text-base cursor-default">حساب کاربری ندارم.</p>
                    <button type="button" onClick={() => navigate("/auth/register")}
                            className="mx-1 text-var-color-25 text-base cursor-pointer hover:underline underline-offset-7 bg-transparent border-none p-0">
                        ثبت نام
                    </button>
                </div>
                <button type="button" onClick={() => navigate("/auth/forget-password")}
                        className="text-var-color-15 text-[16px] text-center hover:underline underline-offset-7 bg-transparent border-none cursor-pointer p-0">
                    فراموشی رمز عبور
                </button>
            </footer>
        </form>
    );
};

export default Login;
