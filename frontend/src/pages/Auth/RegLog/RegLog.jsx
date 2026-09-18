import {useLocation} from "react-router";
import AuthBackdrop from "../components/AuthBackdrop.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";

/**
 * پوستهٔ ورود و ثبت‌نام — ظاهرِ صفحهٔ ورودِ HMS، با ورودِ آبی و ثبت‌نامِ صورتی.
 *
 * هر دو فرم همیشه رندر می‌شوند و با جابه‌جاییِ افقی یکی‌شان دیده می‌شود؛ همان
 * انتقالِ نرمی که SAM دارد. فرمِ غیرفعال با `inert` از دسترسِ تب و کلیک خارج است.
 *
 * ⚠️ **هر دو کارت ۶۴۰ پیکسل‌اند** (`h-160`)، اندازهٔ HMS. عدد ثابت و پیکسلی است
 * نه `auto`، چون دو فرم محتوای هم‌اندازه ندارند و کارت موقعِ اسلاید می‌پرید.
 * فرم‌ها `flex-col` با `main`ِ `flex-1` هستند تا فضای اضافه بالا و پایینِ
 * محتوا پخش شود، نه اینکه ته کارت تلنبار شود.
 */
const RegLog = () => {
    const {pathname} = useLocation();
    const auth = pathname.includes("register") ? "register" : "login";

    return (
        <AuthBackdrop register={auth === "register"}>
            <div className="relative w-100 max-w-[calc(100vw-2rem)] h-160 overflow-hidden">
                <div className={`absolute ${auth === "login" ? "right-0" : "-right-100"} top-0 bottom-0 flex flex-row justify-start items-center transition-all duration-200 ease-in-out`}>
                    <Login key={`login-${auth}`} active={auth === "login"}/>
                    <Register key={`register-${auth}`} active={auth === "register"}/>
                </div>
            </div>
        </AuthBackdrop>
    );
};

export default RegLog;
