import {useRef, useState} from "react";
import {useNavigate} from "react-router";
import toast from "react-hot-toast";
import {GrPhone} from "react-icons/gr";
import {FaUserPlus} from "react-icons/fa6";
import {FiUserPlus} from "react-icons/fi";
import {IoMdLock} from "react-icons/io";
import {useAuth} from "../../../../context/AuthContext.js";
import {authApi} from "../../../../api/auth.js";
import {notify, notifyLoading} from "../../../../lib/notify.jsx";
import {sanitizePhone} from "../../../../lib/utils.js";
import {registerSchema} from "../../../../validators/auth.js";
import {useInputTabLoop} from "../../../../lib/useInputTabLoop.js";
import AuthHeader from "../../components/AuthHeader.jsx";
import EyeButton from "../../components/EyeButton.jsx";
import Field from "../../components/Field.jsx";

const FIELD_INDEX = {fullname: 0, phone: 1, password: 2, repeat_password: 3};

/** ثبت‌نام — صورتی، عیناً رنگِ دومِ HMS. قرینه‌اش `Login` است با آبی. */
const Register = ({active = false}) => {
    // Tab فقط بینِ فیلدها می‌چرخد؛ دکمه‌های ناوبریِ همین فرم از چرخه
    // بیرون‌اند. `active` هم پاس می‌شود تا فرمِ پنهان لیسنر نگذارد.
    const formRef = useRef(null);
    useInputTabLoop(formRef, active);

    const {setUser} = useAuth();
    const navigate = useNavigate();

    const [fullname, setFullname] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showRepeat, setShowRepeat] = useState(false);
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

        const parsed = registerSchema.safeParse({fullname, phone, password, repeat_password: repeatPassword});
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
            const res = await authApi.register({fullname, phone, password});
            toast.dismiss(loadingId);
            notify(res.message, "success", 2000);
            // سرور بعد از ثبت‌نام خودش کاربر را وارد می‌کند، پس ورود دوباره لازم نیست
            setUser(res.userData);
            navigate("/home", {replace: true});
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
        <form ref={formRef} className="w-100 h-160 rounded-3xl px-6 pt-6 pb-8 auth-card flex flex-col"
              onSubmit={onSubmit} autoComplete="off" inert={!active}>
            <AuthHeader title="ثبت نام"/>

            {/* همان دلیلِ `Login` — فضای اضافه بالا و پایینِ گروه پخش می‌شود */}
            <main className="w-full flex-1 flex flex-col justify-center">
                {/* ⚠️ فاصله با `space-y` است نه `my-*`ِ هر فیلد: `main` فلکس است و
                    داخلِ فلکس مارجین‌ها روی هم نمی‌افتند، پس `my-5`ِ پشتِ سرِ هم
                    فاصلهٔ ۴۰ پیکسلی می‌ساخت. ۲۰ پیکسل همان فاصلهٔ قبلیِ این فرم
                    است و کارت را هم‌قدِ ورود پر می‌کند. */}
                <div className="space-y-5">
                    <Field
                        tone="secondary"
                        label="نام و نام خانوادگی"
                        icon={<FaUserPlus className="w-4 h-4"/>}
                        inputRef={setInputRef(0)}
                        value={fullname}
                        placeholder="نام و نام خانوادگی خود را وارد کنید..."
                        error={errors.fullname}
                        onChange={(e) => {
                            setFullname(e.target.value);
                            setErrors((prev) => ({...prev, fullname: ""}));
                        }}
                    />

                    <Field
                        tone="secondary"
                        label="شماره همراه"
                        icon={<GrPhone className="w-4 h-4"/>}
                        inputRef={setInputRef(1)}
                        value={phone}
                        inputMode="numeric"
                        placeholder="شماره همراه خود را وارد کنید..."
                        error={errors.phone}
                        onChange={(e) => {
                            setPhone(sanitizePhone(e.target.value));
                            setErrors((prev) => ({...prev, phone: ""}));
                        }}
                    />

                    <Field
                        tone="secondary"
                        label="رمز عبور"
                        icon={<IoMdLock className="w-4 h-4"/>}
                        inputRef={setInputRef(2)}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        autoComplete="new-password"
                        placeholder="رمز عبور خود را وارد کنید..."
                        error={errors.password}
                        trailing={
                            <EyeButton shown={showPassword} disabled={password.length === 0}
                                       onToggle={() => setShowPassword((s) => !s)}/>
                        }
                        onChange={(e) => {
                            const value = e.target.value;
                            setPassword(value);
                            if (value.length === 0) setShowPassword(false);
                            setErrors((prev) => ({...prev, password: ""}));
                        }}
                    />

                    {/* تکرار رمز عبور — قرینهٔ دقیقِ فیلدِ بالا. نمایش/پنهانِ هر
                        کدام جداست: کاربر ممکن است فقط بخواهد ببیند در کدامشان
                        اشتباه تایپ کرده. */}
                    <Field
                        tone="secondary"
                        label="تکرار رمز عبور"
                        icon={<IoMdLock className="w-4 h-4"/>}
                        inputRef={setInputRef(3)}
                        type={showRepeat ? "text" : "password"}
                        value={repeatPassword}
                        autoComplete="new-password"
                        placeholder="رمز عبور را دوباره وارد کنید..."
                        error={errors.repeat_password}
                        trailing={
                            <EyeButton shown={showRepeat} disabled={repeatPassword.length === 0}
                                       onToggle={() => setShowRepeat((s) => !s)}/>
                        }
                        onChange={(e) => {
                            const value = e.target.value;
                            setRepeatPassword(value);
                            if (value.length === 0) setShowRepeat(false);
                            setErrors((prev) => ({...prev, repeat_password: ""}));
                        }}
                    />
                </div>

                <button type="submit" disabled={submitting}
                        className="w-full py-2.5 mt-5 rounded-xl auth-btn auth-btn-secondary disabled:opacity-60 disabled:cursor-not-allowed">
                    <FiUserPlus className="w-5 h-5 ml-2"/>
                    <span className="text-[17px]">{submitting ? "در حال ثبت نام ..." : "ثبت نام"}</span>
                </button>
            </main>

            <footer className="flex justify-center items-center mt-6">
                <p className="m-0 text-var-color-71 dark:text-var-color-70 text-base cursor-default">
                    قبلا ثبت نام <span className="tracking-normal">کرده‌ام</span>.
                </p>
                {/* رنگِ این لینک **آبی** است نه صورتی — رنگِ فرمی که به آن می‌برد */}
                <button type="button" onClick={() => navigate("/auth/login")}
                        className="mx-1 text-var-color-19 dark:text-var-color-76 text-base cursor-pointer hover:underline underline-offset-7 bg-transparent border-none p-0">
                    ورود
                </button>
            </footer>
        </form>
    );
};

export default Register;
