import {useLocation} from "react-router";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";

// هر دو فرم همیشه رندر می‌شوند و با جابه‌جاییِ افقی یکی‌شان دیده می‌شود؛
// همان انتقالِ نرمی که SAM دارد. فرمِ غیرفعال با inert از دسترسِ تب و کلیک خارج است.
const RegLog = () => {
    const {pathname} = useLocation();
    const auth = pathname.includes("register") ? "register" : "login";

    return (
        <section className="w-full min-h-screen flex flex-col justify-center items-center bg-[radial-gradient(circle_at_50%_0%,#f9fafb_0%,#f3f4f6_60%)] dark:bg-[radial-gradient(circle_at_50%_0%,#171b2b_0%,#0B0E14_60%)]">
            <div className="relative w-100 max-w-[calc(100vw-2rem)] h-127 overflow-hidden">
                <div className={`absolute ${auth === "login" ? "right-0" : "-right-100"} top-0 bottom-0 flex flex-row justify-start items-center transition-all duration-200 ease-in-out`}>
                    <Login key={`login-${auth}`} active={auth === "login"}/>
                    <Register key={`register-${auth}`} active={auth === "register"}/>
                </div>
            </div>
        </section>
    );
};

export default RegLog;
