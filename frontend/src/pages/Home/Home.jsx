import {Suspense, lazy} from "react";
import Sidebar from "../../components/common/Sidebar.jsx";
import HomeSidebar from "./components/HomeSidebar.jsx";

// داشبورد کلِ recharts را با خودش می‌آورد. lazy نگهش می‌داریم تا آن وزن روی
// صفحه‌های ورود و ثبت‌نام — که اولین چیزی‌اند که کاربر می‌بیند — ننشیند.
const Dashboard = lazy(() => import("./components/Dashboard.jsx"));

/**
 * صفحهٔ خانه — داشبوردِ برنامه.
 *
 * تنها صفحه‌ای است که سایدبارِ ناوبری دارد؛ بخش‌های دیگر (مشتریان، تراکنش‌ها،
 * گفتگو) از همین‌جا باز می‌شوند و خودشان ۹۰٪ عرضِ صفحه‌اند.
 */
const Home = () => (
    // در موبایل عمودی می‌چیند: با flex-row سایدبارِ تمام‌عرض، ستونِ محتوا را به صفر
    // می‌رساند. آنجا سایدبار ارتفاعِ محدود می‌گیرد و محتوا زیرش می‌آید.
    <section className="h-full min-h-0 flex flex-col md:flex-row gap-3 2xs:gap-4">
        <Sidebar className="max-h-52 md:max-h-none">
            <HomeSidebar/>
        </Sidebar>

        <div className="flex-1 min-w-0 min-h-0">
            <Suspense fallback={<DashboardFallback/>}>
                <Dashboard/>
            </Suspense>
        </div>
    </section>
);

// تا وقتی چانکِ داشبورد می‌رسد، جای خالیِ صفحه نباید بپرد
const DashboardFallback = () => (
    <div className="h-full min-h-0 flex items-center justify-center">
        <span className="flex flex-row items-center gap-1.5" aria-label="در حال بارگذاری داشبورد">
            {[0, 1, 2].map((dot) => (
                <span key={dot} className="w-2 h-2 rounded-full bg-var-color-15 animate-bounce"
                      style={{animationDelay: `${dot * 120}ms`}}/>
            ))}
        </span>
    </div>
);

export default Home;
