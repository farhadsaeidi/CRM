import {useEffect, useState} from "react";
import {FiClock, FiMoon, FiPieChart, FiTrendingUp, FiUserPlus, FiUsers} from "react-icons/fi";
import {HiOutlineArrowsRightLeft, HiOutlineBanknotes} from "react-icons/hi2";
import {FaMedal} from "react-icons/fa6";
import {TbTargetArrow} from "react-icons/tb";
import {BsGraphDownArrow} from "react-icons/bs";
import {dashboardApi} from "../../../api/dashboard.js";
import ScrollContainer from "../../../components/common/ScrollContainer.jsx";
import {faCompact, faPercent, toFaDigits} from "../../../lib/chart.js";
import {OPEN_NEW_CUSTOMER_EVENT} from "../../../lib/events.js";
import {notify} from "../../../lib/notify.jsx";
import DashboardToolbar from "./DashboardToolbar.jsx";
import DashboardTile from "./DashboardTile.jsx";
import KpiCard from "../../../components/common/KpiCard.jsx";
import TrendChart from "./TrendChart.jsx";
import CustomerMixChart from "./CustomerMixChart.jsx";
import AgingChart from "./AgingChart.jsx";
import TopDebtors from "./TopDebtors.jsx";
import BestPayers from "./BestPayers.jsx";
import {RecentCustomers, RecentTransactions} from "./RecentLists.jsx";
import DormantCustomers from "./DormantCustomers.jsx";
import ConcentrationCard from "./ConcentrationCard.jsx";
import DebtorsCta from "./DebtorsCta.jsx";

// گامِ تاخیرِ ورودِ کاشی‌ها. کوچک نگه داشته شده: با دوازده کاشی، گامِ بزرگ یعنی
// آخرین کاشی یک ثانیه بعد از اولی ظاهر شود که دیگر «انیمیشن» نیست، «کندی» است.
const STEP = 45;

const SKELETONS = [
    "h-28 xl:col-span-1", "h-28 xl:col-span-1", "h-28 xl:col-span-1", "h-28 xl:col-span-1",
    "h-80 xl:col-span-2", "h-80 xl:col-span-1",
    "h-64 xl:col-span-1", "h-64 xl:col-span-1", "h-64 xl:col-span-1",
];

const Dashboard = () => {
    const [period, setPeriod] = useState("year");
    const [refreshKey, setRefreshKey] = useState(0);
    const [state, setState] = useState({data: null, loading: true, failed: false});
    // با هر بارگذاریِ موفق یکی جلو می‌رود و کلیدِ گریدِ کاشی‌ها می‌شود؛ همین باعث
    // می‌شود کلِ داشبورد دوباره mount و انیمیشنِ ورودش (و انیمیشنِ نمودارها) از نو
    // پخش شود. بدونِ آن، تغییرِ دوره فقط عددها را بی‌صدا عوض می‌کرد.
    const [revision, setRevision] = useState(0);

    // setLoading عمداً اینجا نیست بلکه در هندلرهاست — قاعدهٔ set-state-in-effect
    useEffect(() => {
        let ignore = false;
        dashboardApi.get(period)
            .then((res) => {
                if (ignore) return;
                setState({data: res, loading: false, failed: false});
                setRevision((r) => r + 1);
            })
            .catch(() => {
                if (ignore) return;
                notify("دریافت اطلاعات داشبورد ناموفق بود.", "error");
                setState((prev) => ({...prev, loading: false, failed: true}));
            });
        return () => {
            ignore = true;
        };
    }, [period, refreshKey]);

    const startLoading = () => setState((prev) => ({...prev, loading: true}));
    const changePeriod = (next) => {
        if (next === period) return;
        startLoading();
        setPeriod(next);
    };
    const refresh = () => {
        startLoading();
        setRefreshKey((k) => k + 1);
    };

    const {data, loading, failed} = state;
    const today = data?.today;
    const todayLabel = today
        ? `امروز ${toFaDigits(`${today.day} ${today.month_label} ${today.year}`)}`
        : "در حال دریافت اطلاعات …";

    return (
        <section className="h-full min-h-0 flex flex-col">
            <DashboardToolbar period={period} onPeriod={changePeriod} onRefresh={refresh}
                              loading={loading} todayLabel={todayLabel}/>

            {/* trackPadding برابرِ شعاعِ گوشهٔ کاشی‌هاست (rounded-[18px])، وگرنه
                ریلِ اسکرول تا کنارِ انحنای گوشه بالا می‌رود و رویش می‌افتد */}
            <ScrollContainer className="flex-1 min-h-0" overflowX="hidden" position="right" trackPadding={18}>
                <div className="pl-2 pb-2">
                    {!data ? (
                        <SkeletonGrid failed={failed && !loading}/>
                    ) : data.customers_total === 0 ? (
                        <FirstRun onAdd={() => window.dispatchEvent(new CustomEvent(OPEN_NEW_CUSTOMER_EVENT))}/>
                    ) : (
                        // key: با هر بازخوانی کلِ گرید از نو ساخته می‌شود تا انیمیشن‌ها
                        // دوباره اجرا شوند. loading روی شفافیت می‌نشیند نه روی نمایش،
                        // پس داده‌های قبلی حین به‌روزرسانی سرِ جایشان می‌مانند.
                        <div key={revision}
                             className={`transition-opacity duration-300 ${loading ? "opacity-45" : "opacity-100"}`}>
                            <Tiles data={data}/>
                        </div>
                    )}
                </div>
            </ScrollContainer>
        </section>
    );
};

// --------------------------------------------------------------- کاشی‌ها

const Tiles = ({data}) => {
    const {kpi, mix, aging, concentration, debtors_total: debtors} = data;
    const previous = data.previous_label;
    const owed = kpi.balance.value < 0;
    // تاخیرِ ورودِ هر کاشی از جایگاهش می‌آید. شمارندهٔ متغیر اینجا ممنوع است
    // (قاعدهٔ react-hooks/immutability: تغییرِ متغیر بعد از پایانِ رندر)، پس
    // شماره‌ها صریح نوشته می‌شوند.
    const at = (position) => position * STEP;

    return (
        <>
            <div className="grid grid-cols-1 2xs:grid-cols-2 xl:grid-cols-4 gap-3">
                {/* رنگِ این کارت بنفشِ ثابت است و با علامتِ مانده عوض نمی‌شود:
                    وقتی مانده منفی بود همان صورتیِ کارتِ «نسیه» می‌شد و دو کارتِ
                    کنارِ هم یک رنگ می‌گرفتند. طلب یا بدهی بودن را پسوندِ رنگی
                    می‌گوید که صریح‌تر هم هست. */}
                <KpiCard
                    title="ماندهٔ کل دفتر" delay={at(1)}
                    value={Math.abs(kpi.balance.value)} suffix={owed ? "تومان طلب" : "تومان بدهی"}
                    suffixClass={owed ? "text-var-color-55" : "text-var-color-31"}
                    icon={HiOutlineBanknotes} accent="var(--color-var-color-25)"
                    hint={`${toFaDigits(kpi.balance.transactions)} تراکنش در کلِ دفتر`}
                />
                <KpiCard
                    title={`نسیهٔ ${data.period_label}`} delay={at(2)}
                    value={kpi.debt.value} suffix="تومان" icon={BsGraphDownArrow}
                    accent="var(--color-var-color-55)" tone="bad"
                    delta={kpi.debt.delta} previousLabel={previous}
                />
                <KpiCard
                    title={`وصولیِ ${data.period_label}`} delay={at(3)}
                    value={kpi.paid.value} suffix="تومان" icon={FiTrendingUp}
                    accent="var(--color-var-color-31)" tone="good"
                    delta={kpi.paid.delta} previousLabel={previous}
                />
                <KpiCard
                    title="نرخ وصول" delay={at(4)}
                    value={kpi.rate.value ?? 0} format={faPercent} icon={TbTargetArrow}
                    accent="var(--color-var-color-15)" tone="good"
                    delta={kpi.rate.delta} previousLabel={previous}
                    hint={kpi.rate.value === null ? "در این دوره نسیه‌ای ثبت نشده" : undefined}
                />
            </div>

            <div className="mt-3 grid grid-cols-1 xl:grid-cols-3 gap-3">
                <DashboardTile
                    title="روند نسیه و وصولی" subtitle="دوازده ماهِ گذشته"
                    icon={FiTrendingUp} delay={at(5)} className="xl:col-span-2"
                    empty={data.trend.every((row) => !row.debt && !row.paid)}
                    emptyText="در دوازده ماهِ گذشته تراکنشی ثبت نشده"
                >
                    <TrendChart data={data.trend}/>
                </DashboardTile>

                <DashboardTile
                    title="ترکیب مشتریان" subtitle="بر پایهٔ ماندهٔ حساب"
                    icon={FiPieChart} delay={at(6)}
                    empty={mix.total === 0} emptyText="هنوز مشتری‌ای ثبت نشده"
                >
                    <CustomerMixChart mix={mix}/>
                </DashboardTile>

                <DashboardTile
                    title="بدهکارترین مشتریان" subtitle={`${toFaDigits(debtors.count)} نفر، ${faCompact(debtors.amount)} تومان`}
                    icon={BsGraphDownArrow} delay={at(7)}
                    empty={data.top_debtors.length === 0}
                    emptyText="هیچ مشتری‌ای بدهکار نیست 🎉"
                >
                    <TopDebtors rows={data.top_debtors}/>
                </DashboardTile>

                <DashboardTile
                    title="سررسید بدهی" subtitle="بر پایهٔ روزهای گذشته از آخرین تراکنش"
                    icon={FiClock} delay={at(8)}
                    empty={aging.every((bucket) => !bucket.amount)}
                    emptyText="بدهیِ سررسیدشده‌ای وجود ندارد"
                >
                    <AgingChart data={aging}/>
                </DashboardTile>

                <DebtorsCta count={debtors.count} amount={debtors.amount} delay={at(9)}/>

                {/* ریتمِ چیدمان عمداً پهن-باریک است: کاشی‌های جدولی و نموداری دو
                    ستون می‌گیرند و فهرست‌های کوتاه یک ستون. */}
                <DashboardTile
                    title="آخرین تراکنش‌ها" subtitle="پنج ردیفِ تازهٔ دفتر"
                    icon={HiOutlineArrowsRightLeft} delay={at(10)} className="xl:col-span-2"
                    empty={data.recent_transactions.length === 0}
                    emptyText="هنوز تراکنشی ثبت نشده"
                >
                    <RecentTransactions rows={data.recent_transactions}/>
                </DashboardTile>

                <DashboardTile
                    title="خوش‌حساب‌ترین مشتریان" subtitle="بیشترین نسبتِ پرداخت به نسیه"
                    icon={FaMedal} delay={at(11)}
                    empty={data.best_payers.length === 0}
                    emptyText="هنوز مشتری‌ای نسیه نگرفته که خوش‌حسابی‌اش سنجیده شود"
                >
                    <BestPayers rows={data.best_payers}/>
                </DashboardTile>

                <DashboardTile
                    title="مشتریان راکد" subtitle={`${toFaDigits(data.dormant_total)} نفر نیاز به پیگیری دارند`}
                    icon={FiMoon} delay={at(12)} className="xl:col-span-2"
                    empty={data.dormant.length === 0}
                    emptyText="همهٔ مشتریان به‌تازگی فعال بوده‌اند"
                >
                    <DormantCustomers rows={data.dormant}/>
                </DashboardTile>

                <DashboardTile
                    title="تازه‌ترین مشتریان" subtitle="به ترتیبِ تاریخ ثبت"
                    icon={FiUserPlus} delay={at(13)}
                    empty={data.recent_customers.length === 0}
                    emptyText="هنوز مشتری‌ای ثبت نشده"
                >
                    <RecentCustomers rows={data.recent_customers}/>
                </DashboardTile>

                <DashboardTile
                    title="تمرکز دفتر" subtitle="سهمِ پرمعامله‌ترین مشتریان"
                    icon={FiUsers} delay={at(14)} className="xl:col-span-3"
                    empty={!concentration.total}
                    emptyText="هنوز گردشی برای سنجشِ تمرکز نیست"
                >
                    <ConcentrationCard data={concentration}/>
                </DashboardTile>
            </div>
        </>
    );
};

// ---------------------------------------------------- حالت‌های بدونِ داده

const SkeletonGrid = ({failed}) => (
    <div className="grid grid-cols-1 2xs:grid-cols-2 xl:grid-cols-3 gap-3">
        {failed && (
            <p className="col-span-full m-0 p-4 rounded-[18px] text-[12.5px] text-center
                          bg-var-color-26 text-var-color-28 border border-var-color-45">
                دریافت اطلاعات داشبورد ناموفق بود. دکمهٔ بازخوانی را بزنید.
            </p>
        )}
        {!failed && SKELETONS.map((className, index) => (
            <div key={index}
                 style={{animationDelay: `${index * STEP}ms`}}
                 className={`animate-pulse rounded-[18px] ${className}
                             bg-var-color-01 dark:bg-var-color-36
                             border border-var-color-02 dark:border-var-color-38`}/>
        ))}
    </div>
);

// مالکِ تازه‌وارد به‌جای دوازده کارتِ خالی، یک دعوتِ روشن می‌بیند
const FirstRun = ({onAdd}) => (
    <section className="animate-fade-up flex flex-col items-center justify-center gap-4 py-16 px-6 text-center
                        rounded-[18px] bg-var-color-00 dark:bg-var-color-36
                        border border-var-color-02 dark:border-var-color-38">
        <span className="w-14 h-14 rounded-2xl flex items-center justify-center
                         bg-var-color-12 dark:bg-var-color-44 border border-var-color-13 dark:border-var-color-16">
            <FiUsers className="w-7 h-7 text-var-color-15"/>
        </span>
        <h3 className="m-0 text-[18px] font-IRANSansXFaNumDemiBold text-var-color-06 dark:text-var-color-01">
            دفترتان هنوز خالی است
        </h3>
        <p className="m-0 max-w-md text-[12.5px] leading-6 text-var-color-04 dark:text-var-color-39">
            با ثبتِ نخستین مشتری شروع کنید. به‌محضِ ثبتِ اولین تراکنش، نمودارها و
            شاخص‌های این صفحه هم پر می‌شوند.
        </p>
        <button type="button" onClick={onAdd}
                className="mt-1 px-5 py-2 rounded-xl btn btn-bluish text-[13px]">
            ثبت نخستین مشتری
        </button>
    </section>
);


export default Dashboard;
