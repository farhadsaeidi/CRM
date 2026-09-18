/**
 * زمینهٔ مشترکِ صفحه‌های احراز هویت — ورود، ثبت‌نام، ورود با پیامک و فراموشیِ
 * رمز. عیناً `AuthBackdrop`ِ پروژهٔ HMS: گرادیانِ ماتِ `auth-backdrop` و دیترِ
 * ضعیفِ `auth-noise` رویش. چراییِ هر دو در `index.css` است.
 *
 * ⚠️ **جداست تا این دو لایه در چهار صفحه کپی نشوند.** لایهٔ سومی اگر روزی
 * لازم شد، یک جا اضافه می‌شود.
 *
 * ⚠️ **`accent-base` عمداً اینجا نیست** (از ۱۴۰۵/۰۶/۲۸). این صفحه‌ها رنگِ
 * «انتخاب رنگ» را دنبال می‌کنند: ورود رنگِ پالت را می‌گیرد و ثبت‌نام رنگِ
 * مکملش را. آن قفل همه‌چیز را به آبی برمی‌گرداند.
 *
 * @param register زمینهٔ ثبت‌نام به‌جای زمینهٔ ورود
 */
const AuthBackdrop = ({register = false, children}) => (
    <section
        className={`relative w-full min-h-screen flex flex-col justify-center items-center
                    overflow-hidden auth-backdrop ${register ? "is-register" : ""}`}
    >
        <div aria-hidden="true" className="auth-noise"/>
        {children}
    </section>
);

export default AuthBackdrop;
