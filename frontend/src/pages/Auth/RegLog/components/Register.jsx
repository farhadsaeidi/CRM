import {useId, useRef, useState} from "react";
import {useNavigate} from "react-router";
import toast from "react-hot-toast";
import {GrPhone} from "react-icons/gr";
import {FaRegEye, FaRegEyeSlash, FaRegUser} from "react-icons/fa6";
import {FiLock, FiMapPin, FiUserPlus} from "react-icons/fi";
import {useAuth} from "../../../../context/AuthContext.js";
import {authApi} from "../../../../api/auth.js";
import ThemeSwitcher from "../../../../components/common/ThemeSwitcher.jsx";
import {notify, notifyLoading} from "../../../../lib/notify.jsx";
import {sanitizePhone} from "../../../../lib/utils.js";
import {registerSchema} from "../../../../validators/auth.js";

const FIELD_INDEX = {fullname: 0, phone: 1, password: 2, address: 3};

const Register = ({active = false}) => {
    const {setUser} = useAuth();
    const navigate = useNavigate();
    const id = useId();

    const [fullname, setFullname] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const inputsRef = useRef([]);
    const setInputRef = (index) => (el) => {
        // نوشتن در ref داخل کال‌بکِ ref خواندنِ حین رندر نیست؛ قاعده نمی‌تواند
        // تفکیکش کند. فقط برای فوکوس کردن روی فیلدِ خطادار استفاده می‌شود.
        // eslint-disable-next-line react-hooks/refs
        inputsRef.current[index] = el;
    };
    const focusField = (field) => inputsRef.current[FIELD_INDEX[field]]?.focus();

    const onSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        const parsed = registerSchema.safeParse({fullname, phone, address, password});
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
            const res = await authApi.register({fullname, phone, address, password});
            toast.dismiss(loadingId);
            notify(res.message, "success", 2000);
            // سرور بعد از ثبت‌نام خودش کاربر را وارد می‌کند، پس ورود دوباره لازم نیست
            setUser(res.userData);
            navigate("/customers", {replace: true});
        } catch (err) {
            toast.dismiss(loadingId);
            const data = err?.data || {};
            if (data.fieldErrors) {
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
                <h2 className="text-var-color-08 dark:text-var-color-01 text-2xl text-center">ثبت نام</h2>
                <ThemeSwitcher/>
            </header>

            <main className="w-full mt-5">
                {/* نام و نام خانوادگی */}
                <div className="w-full">
                    <label htmlFor={id + "fullname"} className="text-var-color-06 dark:text-var-color-03">
                        نام و نام خانوادگی
                    </label>
                    <div className="relative w-full h-10 mt-2">
                        <FaRegUser className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-25 pointer-events-none"/>
                        <input
                            id={id + "fullname"}
                            ref={setInputRef(0)}
                            type="text"
                            autoComplete="off"
                            value={fullname}
                            placeholder="نام و نام خانوادگی خود را وارد کنید..."
                            onChange={(e) => {
                                setFullname(e.target.value);
                                setErrors((prev) => ({...prev, fullname: ""}));
                            }}
                            className={`w-full h-full text-[15px] pr-8.5 pl-3 rounded-xl input input-purplish input-placeholder ${errors.fullname ? "input-error" : ""}`}
                        />
                    </div>
                </div>

                {/* شماره همراه */}
                <div className="w-full my-5">
                    <label htmlFor={id + "phone"} className="text-var-color-06 dark:text-var-color-03">شماره همراه</label>
                    <div className="relative w-full h-10 mt-2">
                        <GrPhone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-25 pointer-events-none"/>
                        <input
                            id={id + "phone"}
                            ref={setInputRef(1)}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={phone}
                            placeholder="شماره همراه خود را وارد کنید..."
                            onChange={(e) => {
                                setPhone(sanitizePhone(e.target.value));
                                setErrors((prev) => ({...prev, phone: ""}));
                            }}
                            className={`w-full h-full text-[15px] pr-8.5 pl-3 rounded-xl input input-purplish input-placeholder ${errors.phone ? "input-error" : ""}`}
                        />
                    </div>
                </div>

                {/* رمز عبور */}
                <div className="w-full my-5">
                    <label htmlFor={id + "password"} className="text-var-color-06 dark:text-var-color-03">رمز عبور</label>
                    <div className="relative w-full h-10 mt-2">
                        <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-25 pointer-events-none"/>
                        <input
                            id={id + "password"}
                            ref={setInputRef(2)}
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={password}
                            placeholder="رمز عبور خود را وارد کنید..."
                            onChange={(e) => {
                                const value = e.target.value;
                                setPassword(value);
                                if (value.length === 0) setShowPassword(false);
                                setErrors((prev) => ({...prev, password: ""}));
                            }}
                            className={`w-full h-full text-[15px] pr-8.5 pl-10 rounded-xl input input-purplish input-placeholder ${errors.password ? "input-error" : ""}`}
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

                {/* آدرس */}
                <div className="w-full my-5">
                    <label htmlFor={id + "address"} className="text-var-color-06 dark:text-var-color-03">آدرس</label>
                    <div className="relative w-full h-10 mt-2">
                        <FiMapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-var-color-25 pointer-events-none"/>
                        <input
                            id={id + "address"}
                            ref={setInputRef(3)}
                            type="text"
                            autoComplete="off"
                            value={address}
                            placeholder="آدرس خود را وارد کنید..."
                            onChange={(e) => {
                                setAddress(e.target.value);
                                setErrors((prev) => ({...prev, address: ""}));
                            }}
                            className={`w-full h-full text-[15px] pr-8.5 pl-3 rounded-xl input input-purplish input-placeholder ${errors.address ? "input-error" : ""}`}
                        />
                    </div>
                </div>

                <button type="submit" disabled={submitting}
                        className="w-full py-2.5 rounded-xl btn btn-purplish disabled:opacity-60 disabled:cursor-not-allowed">
                    <FiUserPlus className="w-5 h-5 ml-2"/>
                    <span className="text-[17px]">{submitting ? "در حال ثبت نام ..." : "ثبت نام"}</span>
                </button>
            </main>

            <footer className="flex justify-center items-center mt-6">
                <p className="m-0 text-var-color-06 dark:text-var-color-03 text-base cursor-default">
                    قبلا ثبت نام <span className="tracking-normal">کرده‌ام</span>.
                </p>
                <button type="button" onClick={() => navigate("/auth/login")}
                        className="mx-1 text-var-color-15 text-base cursor-pointer hover:underline underline-offset-7 bg-transparent border-none p-0">
                    ورود
                </button>
            </footer>
        </form>
    );
};

export default Register;
