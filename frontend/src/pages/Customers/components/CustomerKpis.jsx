import {useEffect, useState} from "react";
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
 * ⚠️ کارت‌ها **فقط‌خواندنی**اند. پیش‌تر کلیک روی «بدهکاران» و «بستانکاران»
 * فیلترِ جدول را عوض می‌کرد، ولی همان فیلتر از نوارِ خودِ جدول هم در دسترس است —
 * دو راه برای یک کار، و کارتی که هم عدد نشان می‌دهد هم دکمه است، معلوم نمی‌کند
 * کدام. حالا اینجا فقط گزارش است و فیلتر کارِ جدول.
 */
const CustomerKpis = ({refreshKey = 0}) => {
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
                accent="var(--color-var-color-15)"
                delta={stats.new.delta} previousLabel="ماه گذشته" tone="good"
                hint={stats.new.count
                    ? `${toFaDigits(stats.new.count)} نفر در ${stats.new.month_label} اضافه شدند`
                    : `در ${stats.new.month_label} مشتری تازه‌ای ثبت نشده`}
            />

            <KpiCard
                title="بدهکاران" delay={90}
                value={debtors.count} suffix="نفر" icon={BsGraphDownArrow}
                accent="var(--color-var-color-55)"
                hint={`${faCompact(debtors.amount)} تومان طلب`}
                hintClass="text-var-color-55"
            />

            <KpiCard
                title="بستانکاران" delay={135}
                value={creditors.count} suffix="نفر" icon={BsGraphUpArrow}
                accent="var(--color-var-color-31)"
                hint={`${faCompact(creditors.amount)} تومان بستانکاری`}
                hintClass="text-var-color-31"
            />

            {/* «راکد» یعنی یا هرگز معامله‌ای نکرده یا مدتی است خبری ازش نیست؛ هر دو
                گروه پیگیری می‌خواهند ولی از دو جنس‌اند، پس تفکیکشان گفته می‌شود */}
            <KpiCard
                title="مشتریان نیازمندِ پیگیری" delay={180}
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
