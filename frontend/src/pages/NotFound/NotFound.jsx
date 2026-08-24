import {Link} from "react-router";
import {FaHome} from "react-icons/fa";

// این صفحه هدر و فوتر ندارد (chrome: false در routes.jsx)، پس پس‌زمینه و
// چیدمانِ تمام‌صفحه‌اش را — مثل صفحه‌های احراز هویت — خودش می‌سازد.
const NotFound = () => {
    return (
        <section className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center font-IRANSansXFaNumRegular bg-var-color-49 dark:bg-var-color-35 bg-dotted">
            <h1 className="font-IRANSansXFaNumBlack text-7xl text-var-color-15 animate-fade-up">۴۰۴</h1>
            <p className="text-var-color-06 dark:text-var-color-03 animate-fade-up" style={{animationDelay: "80ms"}}>
                صفحه‌ای که دنبالش بودید پیدا نشد.
            </p>
            {/* مقصد `/` است نه `/home`: کاربرِ واردنشده باید به صفحهٔ ورود برود،
                و تصمیمش با AuthRedirect در همان ریشه گرفته می‌شود */}
            <Link
                to="/"
                className="btn btn-bluish rounded-lg px-5 py-2 text-sm gap-2 animate-fade-up"
                style={{animationDelay: "160ms"}}
            >
                <FaHome className="w-4 h-4"/>
                بازگشت به صفحه اصلی
            </Link>
        </section>
    );
};

export default NotFound;
