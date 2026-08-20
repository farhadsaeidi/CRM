import toast from "react-hot-toast";
import ProgressToast from "../components/common/ProgressToast.jsx";

// نمایش پیغام (پیغام‌های قبلی پاک می‌شوند). خودِ ProgressToast زمان‌بندی را مدیریت می‌کند.
export const notify = (message, type = "success", duration = 4000) => {
    toast.dismiss();
    return toast.custom(
        (t) => <ProgressToast t={t} message={message} type={type} duration={duration}/>,
        {duration: Infinity}
    );
};

// پیغام لودینگ که تا بسته‌شدن دستی باقی می‌ماند؛ id برمی‌گرداند.
export const notifyLoading = (message = "در حال پردازش اطلاعات ...") =>
    toast.custom(
        (t) => <ProgressToast t={t} message={message} type="loading" duration={Infinity}/>,
        {duration: Infinity}
    );
