import {useEffect, useState} from "react";
import {FiActivity, FiTrendingUp} from "react-icons/fi";
import {HiOutlineBanknotes} from "react-icons/hi2";
import {BsGraphDownArrow} from "react-icons/bs";
import {transactionsApi} from "../../../api/transactions.js";
import KpiCard from "../../../components/common/KpiCard.jsx";
import {faCompact, faPercent, faShamsi, toFaDigits} from "../../../lib/chart.js";

/**
 * شاخص‌های بالای دفترِ یک مشتری.
 *
 * ⚠️ مثل دو صفحهٔ دیگر، اینها **کلِ حسابِ مشتری** را می‌گویند و به فیلترِ دوره و
 * جستجوی تاریخِ جدول وابسته نیستند. برای همین از سرور می‌آیند و از جمع زدنِ
 * همان فهرستی که جدول نشان می‌دهد ساخته نمی‌شوند — آن فهرست فیلترشده است.
 */
const LedgerKpis = ({customerId, refreshKey = 0}) => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        let ignore = false;
        transactionsApi.stats(customerId)
            .then((res) => {
                if (!ignore) setStats(res);
            })
            // بی‌صدا: نبودِ این نوار نباید مانعِ کار با دفتر شود
            .catch(() => undefined);
        return () => {
            ignore = true;
        };
    }, [customerId, refreshKey]);

    if (!stats) {
        return (
            <div className="shrink-0 mb-3 grid grid-cols-2 xl:grid-cols-4 gap-3">
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

    const {debt, paid} = stats;
    // مانده مثبت یعنی مشتری بستانکار است و منفی یعنی بدهکار — همان قراردادِ
    // کلِ پروژه (`AccountCode`)
    const owes = stats.balance < 0;
    const settled = stats.balance === 0;

    return (
        <div className="shrink-0 mb-3 grid grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
                title="ماندهٔ حساب" delay={45}
                value={Math.abs(stats.balance)}
                suffix={settled ? "تومان — تسویه" : owes ? "تومان بدهکار" : "تومان بستانکار"}
                suffixClass={settled ? "" : owes ? "text-var-color-55" : "text-var-color-31"}
                icon={HiOutlineBanknotes} accent="var(--color-var-color-25)"
                hint={stats.days_since_last === null
                    ? "هنوز تراکنشی ثبت نشده"
                    : `آخرین تراکنش ${toFaDigits(stats.days_since_last)} روز پیش`}
            />

            <KpiCard
                title="مجموع نسیه" delay={90}
                value={debt.amount} suffix="تومان" icon={BsGraphDownArrow}
                accent="var(--color-var-color-55)"
                hint={`در ${toFaDigits(debt.rows)} ردیف ثبت شده`}
                hintClass="text-var-color-55"
            />

            <KpiCard
                title="مجموع پرداختی" delay={135}
                value={paid.amount} suffix="تومان" icon={FiTrendingUp}
                accent="var(--color-var-color-31)"
                hint={stats.rate === null
                    ? `در ${toFaDigits(paid.rows)} ردیف ثبت شده`
                    : `${faPercent(stats.rate)} از نسیه پرداخت شده`}
                hintClass="text-var-color-31"
            />

            <KpiCard
                title="تعداد تراکنش‌ها" delay={180}
                value={stats.total} suffix="ردیف" icon={FiActivity}
                accent="var(--color-var-color-15)"
                hint={stats.first
                    ? `از ${faShamsi(stats.first)} — میانگین ${faCompact(stats.average)} تومان`
                    : "هنوز تراکنشی ثبت نشده"}
            />
        </div>
    );
};

export default LedgerKpis;
