import {useLocation} from "react-router";
import OtpPhone from "./components/OtpPhone.jsx";
import OtpConfirm from "./components/OtpConfirm.jsx";

const Otp = () => {
    const {pathname} = useLocation();
    const step = pathname.includes("otp/phone") ? "phone" : "confirm";

    return (
        <section className="w-full min-h-screen flex flex-col justify-center items-center bg-[radial-gradient(circle_at_50%_0%,#f9fafb_0%,#f3f4f6_60%)] dark:bg-[radial-gradient(circle_at_50%_0%,#171b2b_0%,#0B0E14_60%)]">
            <div className="relative w-100 max-w-[calc(100vw-2rem)] h-84 overflow-hidden">
                <div className={`absolute ${step === "phone" ? "right-0" : "-right-100"} top-0 bottom-0 flex flex-row justify-start items-center transition-all duration-200 ease-in-out`}>
                    <OtpPhone key={`otp-phone-${step}`} active={step === "phone"}/>
                    <OtpConfirm key={`otp-confirm-${step}`} active={step === "confirm"}/>
                </div>
            </div>
        </section>
    );
};

export default Otp;
