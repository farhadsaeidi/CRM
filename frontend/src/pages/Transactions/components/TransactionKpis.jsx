import {useEffect, useState} from "react";
import {FiActivity, FiTrendingUp} from "react-icons/fi";
import {HiOutlineArrowsRightLeft} from "react-icons/hi2";
import {BsGraphDownArrow} from "react-icons/bs";
import {allTransactionsApi} from "../../../api/transactions.js";
import KpiCard from "../../../components/common/KpiCard.jsx";
import {faCompact, faPercent, toFaDigits} from "../../../lib/chart.js";

/**
 * شاخص‌های بالای جدولِ همهٔ تراکنش‌ها.
 *
 * ⚠️ مثل شاخص‌های صفحهٔ مشتریان، اینها **کلِ دفتر** را می‌گویند و به فیلترِ دوره و
 * جستجوی تاریخِ جدول وابسته نیستند؛ وگرنه با هر بار عوض کردنِ فیلتر، مبنای
 * مقایسه هم زیر پای کاربر عوض می‌شد.
 */
const TransactionKpis = ({refreshKey = 0}) => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        let ignore = false;
        allTransactionsApi.stats()
            .then((res) => {
                if (!ignore) setStats(res);
            })
            // بی‌صدا: نبودِ این نوار نباید مانعِ کار با جدول شود
            .catch(() => undefined);
        return () => {
            ignore = true;
        };
    }, [refreshKey]);

    if (!stats) {
        return (
            <div className="shrink-0 mb-3 grid grid-cols-1 2xs:grid-cols-2 xl:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((index) => (
                    <div key={index}
                         style={{animationDelay: `${index * 45}ms`}}
                         className="animate-pulse h-25 rounded-[18px]
                                    bg-var-color-01 dark:bg-var-color-36
                                    border border-var-color-02 dark:border-var-color-38"/>
                ))}
            </div>
        );
    }

    const {debt, paid, this_month: month, busiest} = stats;

    return (
        <div className="shrink-0 mb-3 grid grid-cols-1 2xs:grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
                title="تعداد تراکنش‌ها" delay={45}
                value={stats.total} suffix="ردیف" icon={HiOutlineArrowsRightLeft}
                accent="var(--color-var-color-15)"
                delta={month.delta} previousLabel="ماه گذشته" tone="good"
                hint={month.count
                    ? `${toFaDigits(month.count)} ردیف در ${month.month_label}`
                    : busiest
                        ? `پرکارترین ماه: ${busiest.label} با ${toFaDigits(busiest.count)} ردیف`
                        : "هنوز تراکنشی ثبت نشده"}
            />

            <KpiCard
                title="مجموع نسیه" delay={90}
                value={debt.amount} suffix="تومان" icon={BsGraphDownArrow}
                accent="var(--color-var-color-55)"
                hint={`در ${toFaDigits(debt.rows)} ردیف ثبت شده`}
                hintClass="text-var-color-55"
            />

            <KpiCard
                title="مجموع وصولی" delay={135}
                value={paid.amount} suffix="تومان" icon={FiTrendingUp}
                accent="var(--color-var-color-31)"
                hint={stats.rate === null
                    ? `در ${toFaDigits(paid.rows)} ردیف ثبت شده`
                    : `${faPercent(stats.rate)} از نسیه وصول شده`}
                hintClass="text-var-color-31"
            />

            <KpiCard
                title="میانگین هر تراکنش" delay={180}
                value={stats.average} suffix="تومان" icon={FiActivity}
                accent="var(--color-var-color-32)"
                hint={stats.largest
                    ? `بزرگ‌ترین تراکنش: ${faCompact(stats.largest)} تومان`
                    : "هنوز تراکنشی ثبت نشده"}
            />
        </div>
    );
};

export default TransactionKpis;
