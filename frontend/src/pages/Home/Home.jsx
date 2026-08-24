import Sidebar from "../../components/common/Sidebar.jsx";
import HomeSidebar from "./components/HomeSidebar.jsx";

/**
 * صفحهٔ خانه — داشبوردِ برنامه.
 *
 * تنها صفحه‌ای است که سایدبارِ ناوبری دارد؛ بخش‌های دیگر (مشتریان، تراکنش‌ها،
 * گفتگو) از همین‌جا باز می‌شوند و خودشان تمام‌عرض‌اند.
 *
 * ناحیهٔ اصلی فعلاً خالی است. جای نمودارها و کارت‌های آماری همین‌جاست و در
 * گام بعد پر می‌شود.
 */
const Home = () => (
    // در موبایل عمودی می‌چیند: با flex-row سایدبارِ تمام‌عرض، ستونِ محتوا را به صفر
    // می‌رساند. آنجا سایدبار ارتفاعِ محدود می‌گیرد و محتوا زیرش می‌آید.
    <section className="h-full min-h-0 flex flex-col md:flex-row gap-3 2xs:gap-4">
        <Sidebar className="max-h-52 md:max-h-none">
            <HomeSidebar/>
        </Sidebar>

        <div className="flex-1 min-w-0 min-h-0"/>
    </section>
);

export default Home;
