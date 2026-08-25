import {useEffect, useState} from "react";
import {useSearchParams} from "react-router";
import {FiMoon, FiUsers} from "react-icons/fi";
import {BsGraphDownArrow, BsGraphUpArrow} from "react-icons/bs";
import {customersApi} from "../../../api/customers.js";
import KpiCard from "../../../components/common/KpiCard.jsx";
import {faCompact, toFaDigits} from "../../../lib/chart.js";

/**
 * شاخص‌های بالای جدولِ مشتریان.
 *
 * ⚠️ این اعداد **کلِ دفتر** را می‌گویند، نه نتیجهٔ فیلتر و جستجوی جدول. شاخصی که
 * با تایپ در کادرِ جستجو تکان بخورد دیگر شاخص نیست؛ تعدادِ نتیجهٔ فیلترشده را
 * خودِ جدول در نوارِ صفحه‌بندی‌اش نشان می‌دهد.
 *
 * سه کارتِ وضعیت روی کلیک، فیلترِ متناظرِ جدول را می‌گذارند — پس کاشی‌ها راهِ
 * میان‌بر هم هستند نه فقط عدد.
 */
const CustomerKpis = ({refreshKey = 0}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        let ignore = false;
        customersApi.stats()
            .then((res) => {
                if (!ignore) setStats(res);
            })
            // بی‌صدا رد می‌شود: نبودِ این نوار نباید مانعِ کار با جدول شود و
            // پیغامِ خطای دوم کنارِ پیغامِ خودِ جدول فقط نویز است
            .catch(() => undefined);
        return () => {
            ignore = true;
        };
    }, [refreshKey]);

    const applyFilter = (key) => {
        setSearchParams((prev) => {
            const params = new URLSearchParams(prev);
            // کلیکِ دوباره روی همان کارت، فیلتر را برمی‌دارد
            if (params.get("filter") === key) params.delete("filter");
            else params.set("filter", key);
            params.delete("page");
            return params;
        });
    };

    const active = searchParams.get("filter") || "all";

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

    const {debtors, creditors} = stats;

    return (
        <div className="shrink-0 mb-3 grid grid-cols-1 2xs:grid-cols-2 xl:grid-cols-4 gap-3">
            <KpiCard
                title="کل مشتریان" delay={45}
                value={stats.total} suffix="نفر" icon={FiUsers}
                accent="var(--color-var-color-25)"
                delta={stats.new.delta} previousLabel="ماه گذشته" tone="good"
                hint={stats.new.count
                    ? `${toFaDigits(stats.new.count)} نفر در ${stats.new.month_label} اضافه شدند`
                    : `در ${stats.new.month_label} مشتری تازه‌ای ثبت نشده`}
            />

            <KpiCard
                title="بدهکاران" delay={90}
                value={debtors.count} suffix="نفر" icon={BsGraphDownArrow}
                accent="var(--color-var-color-55)"
                onClick={() => applyFilter("debt")} active={active === "debt"}
                hint={`${faCompact(debtors.amount)} تومان طلب`}
                hintClass="text-var-color-55"
            />

            <KpiCard
                title="بستانکاران" delay={135}
                value={creditors.count} suffix="نفر" icon={BsGraphUpArrow}
                accent="var(--color-var-color-31)"
                onClick={() => applyFilter("credit")} active={active === "credit"}
                hint={`${faCompact(creditors.amount)} تومان بستانکاری`}
                hintClass="text-var-color-31"
            />

            {/* «راکد» یعنی یا هرگز معامله‌ای نکرده یا مدتی است خبری ازش نیست؛ هر دو
                گروه پیگیری می‌خواهند ولی از دو جنس‌اند، پس تفکیکشان گفته می‌شود */}
            <KpiCard
                title="نیازمندِ پیگیری" delay={180}
                value={stats.dormant} suffix="نفر" icon={FiMoon}
                accent="var(--color-var-color-53)"
                hint={stats.untouched
                    ? `${toFaDigits(stats.untouched)} نفر هنوز هیچ تراکنشی ندارند`
                    : `بیش از ${toFaDigits(stats.dormant_after_days)} روز بی‌تراکنش`}
            />
        </div>
    );
};

export default CustomerKpis;
