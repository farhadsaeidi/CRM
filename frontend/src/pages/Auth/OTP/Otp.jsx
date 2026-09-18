import {useLocation} from "react-router";
import AuthBackdrop from "../components/AuthBackdrop.jsx";
import OtpPhone from "./components/OtpPhone.jsx";
import OtpConfirm from "./components/OtpConfirm.jsx";

/**
 * ورود با پیامک — دو گام که مثلِ ورود و ثبت‌نام بینِ هم اسلاید می‌کنند.
 *
 * ⚠️ **ارتفاع ثابت نیست**، برخلافِ `RegLog` — همان ساختارِ `Otp`ِ HMS. کارت‌ها
 * در جریانِ عادی کنارِ هم می‌نشینند و با `margin` جابه‌جا می‌شوند، پس ارتفاعِ
 * ظرف از خودِ محتوا می‌آید. پیش‌تر هر دو کارت `h-84` بودند و با `absolute`
 * اسلاید می‌کردند: محتوای بلندتر از ۳۳۶ پیکسل (مثلاً متنی که دوخطی شود) زیرِ
 * `overflow-hidden`ِ ظرف بریده می‌شد، و سرِ تازهٔ کارت‌ها از قبلی بلندتر است.
 */
const Otp = () => {
    const {pathname} = useLocation();
    const step = pathname.includes("otp/phone") ? "phone" : "confirm";

    return (
        <AuthBackdrop>
            <div className="relative w-100 max-w-[calc(100vw-2rem)] overflow-hidden">
                <div className={`flex flex-row justify-start items-start transition-all duration-200 ease-in-out ${step === "phone" ? "mr-0" : "-mr-100"}`}>
                    <div className="w-100 shrink-0">
                        <OtpPhone key={`otp-phone-${step}`} active={step === "phone"}/>
                    </div>
                    <div className="w-100 shrink-0">
                        <OtpConfirm key={`otp-confirm-${step}`} active={step === "confirm"}/>
                    </div>
                </div>
            </div>
        </AuthBackdrop>
    );
};

export default Otp;
