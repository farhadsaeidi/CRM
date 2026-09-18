/**
 * زمینهٔ مشترکِ صفحه‌های احراز هویت — ورود، ثبت‌نام، ورود با پیامک و فراموشیِ
 * رمز. عیناً `AuthBackdrop`ِ پروژهٔ HMS: گرادیانِ ماتِ `auth-backdrop` و دیترِ
 * ضعیفِ `auth-noise` رویش. چراییِ هر دو در `index.css` است.
 *
 * ⚠️ **جداست تا این دو لایه در چهار صفحه کپی نشوند.** لایهٔ سومی اگر روزی
 * لازم شد، یک جا اضافه می‌شود.
 *
 * ⚠️ **`accent-base` همین‌جاست.** اکسنتِ این صفحه‌ها (آبیِ ورود) در هر پالتی
 * پایه می‌ماند: کاربر هنوز وارد نشده و این تجربهٔ برند است، نه ترجیحِ شخصی.
 *
 * @param register زمینهٔ صورتیِ ثبت‌نام به‌جای آبیِ ورود
 */
const AuthBackdrop = ({register = false, children}) => (
    <section
        className={`accent-base relative w-full min-h-screen flex flex-col justify-center items-center
                    overflow-hidden auth-backdrop ${register ? "is-register" : ""}`}
    >
        <div aria-hidden="true" className="auth-noise"/>
        {children}
    </section>
);

export default AuthBackdrop;
