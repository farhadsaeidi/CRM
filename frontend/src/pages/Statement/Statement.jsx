import {useEffect, useState} from "react";
import {FiArrowRight, FiPrinter} from "react-icons/fi";
import LogoIcon from "../../components/common/LogoIcon.jsx";
import {reportsApi} from "../../api/reports.js";
import {faNumber, toFaDigits} from "../../lib/chart.js";
import {notify} from "../../lib/notify.jsx";
import {useGoBack} from "../../lib/useGoBack.js";

/**
 * صورتحسابِ همهٔ مشتریان — یک **سند**، نه یک صفحهٔ دیگرِ برنامه.
 *
 * چرا `chrome: false` و چرا `window.print()` به‌جای PDF سمتِ سرور؟
 * ساختنِ PDFِ فارسیِ راست‌به‌چپ روی سرور دردسرِ فونت و شکستِ حروف دارد، در حالی
 * که خودِ مرورگر همین صفحه را بی‌نقص چاپ می‌کند و کاربر از همان دیالوگ می‌تواند
 * «ذخیره به‌صورت PDF» را هم بزند. پس هم چاپ داریم هم PDF، بدونِ هیچ وابستگی.
 *
 * قاعده‌های `print:` هر چیزی را که به سند تعلق ندارد (نوارِ ابزار) حذف می‌کنند.
 */
const Statement = () => {
    const goBack = useGoBack();
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let ignore = false;
        reportsApi.statement()
            .then((res) => {
                if (!ignore) setData(res);
            })
            .catch(() => {
                if (ignore) return;
                notify("دریافت صورتحساب ناموفق بود.", "error");
                setFailed(true);
            });
        return () => {
            ignore = true;
        };
    }, []);

    const totals = data?.totals;
    const today = data?.generated_at;
    const owed = (totals?.balance ?? 0) < 0;

    return (
        <section className="min-h-screen bg-var-color-49 dark:bg-var-color-35 print:bg-white
                            font-IRANSansXFaNumRegular">
            {/* نوارِ ابزار — به سند تعلق ندارد، پس در چاپ حذف می‌شود */}
            <div className="print:hidden sticky top-0 z-10 border-b backdrop-blur
                            bg-var-color-00/90 dark:bg-var-color-36/90
                            border-var-color-02 dark:border-var-color-38">
                <div className="max-w-4xl mx-auto px-4 py-3 flex flex-row items-center justify-between gap-3">
                    <button type="button" onClick={goBack}
                            className="h-9 px-3 rounded-xl btn btn-bluish text-[13px]">
                        <FiArrowRight className="w-4 h-4 ml-1.5"/>
                        بازگشت
                    </button>
                    <button type="button" onClick={() => window.print()} disabled={!data}
                            className="h-9 px-4 rounded-xl text-[13px] cursor-pointer
                                       flex items-center gap-1.5 transition-all duration-200
                                       bg-var-color-15 text-var-color-11
                                       enabled:hover:brightness-110 enabled:active:scale-[0.98]
                                       disabled:opacity-40 disabled:cursor-not-allowed">
                        <FiPrinter className="w-4 h-4"/>
                        چاپ / ذخیرهٔ PDF
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 2xs:p-6 print:p-0 print:max-w-none">
                {!data ? (
                    <div className="rounded-[18px] p-8 text-center text-[13px]
                                    bg-var-color-00 dark:bg-var-color-36
                                    border border-var-color-02 dark:border-var-color-38
                                    text-var-color-04 dark:text-var-color-39">
                        {failed ? "دریافت صورتحساب ناموفق بود." : "در حال آماده‌سازی صورتحساب …"}
                    </div>
                ) : (
                    <article className="rounded-[18px] p-5 2xs:p-8 print:p-0 print:rounded-none print:border-0
                                        bg-var-color-00 dark:bg-var-color-36 print:bg-white
                                        border border-var-color-02 dark:border-var-color-38">

                        {/* ── سربرگ ───────────────────────────────────── */}
                        <header className="flex flex-row items-start justify-between gap-4 pb-5 border-b
                                           border-var-color-02 dark:border-var-color-38 print:border-black/20">
                            <div className="flex flex-row items-center gap-3 min-w-0">
                                <span className="w-12 h-12 shrink-0">
                                    <LogoIcon className="w-full h-full"/>
                                </span>
                                <div className="min-w-0">
                                    <h1 className="m-0 text-[19px] font-MorabbaMedium tracking-wide
                                                   text-var-color-08 dark:text-var-color-01 print:text-black">
                                        صورتحساب مشتریان
                                    </h1>
                                    <p className="m-0 mt-0.5 text-[12px] text-var-color-04 dark:text-var-color-39
                                                  print:text-black/60">
                                        سامانه مدیریت مشتریان
                                    </p>
                                </div>
                            </div>
                            <div className="text-left shrink-0 text-[12px] leading-6
                                            text-var-color-06 dark:text-var-color-46 print:text-black">
                                <p className="m-0">{data.owner.fullname}</p>
                                <p className="m-0 font-IRANSansXFaNumUltraLight">{toFaDigits(data.owner.phone)}</p>
                                <p className="m-0 text-var-color-04 dark:text-var-color-39 print:text-black/60">
                                    {toFaDigits(`${today.day} ${today.month_label} ${today.year}`)}
                                </p>
                            </div>
                        </header>

                        {/* ── خلاصه ───────────────────────────────────── */}
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 my-5">
                            <Summary label="تعداد مشتریان" value={toFaDigits(totals.customers)} unit="نفر"/>
                            <Summary label="مجموع نسیه" value={faNumber(totals.debt)} unit="تومان"
                                     tone="text-var-color-55"/>
                            <Summary label="مجموع پرداختی" value={faNumber(totals.paid)} unit="تومان"
                                     tone="text-var-color-31"/>
                            <Summary label={owed ? "ماندهٔ طلب" : "ماندهٔ بدهی"}
                                     value={faNumber(Math.abs(totals.balance))} unit="تومان"
                                     tone={owed ? "text-var-color-55" : "text-var-color-31"}/>
                        </div>

                        {/* ── جدول ────────────────────────────────────── */}
                        {data.rows.length === 0 ? (
                            <p className="m-0 py-10 text-center text-[13px]
                                          text-var-color-04 dark:text-var-color-39">
                                هنوز مشتری‌ای ثبت نشده است.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-[12.5px]">
                                    <thead>
                                        <tr className="text-var-color-60 dark:text-var-color-51 print:text-black
                                                       bg-var-color-59 dark:bg-var-color-52 print:bg-black/5">
                                            <th className="text-right font-IRANSansXFaNumMedium px-3 py-2.5 rounded-r-lg print:rounded-none">ردیف</th>
                                            <th className="text-right font-IRANSansXFaNumMedium px-3 py-2.5">نام و نام خانوادگی</th>
                                            <th className="text-center font-IRANSansXFaNumMedium px-3 py-2.5">شماره تماس</th>
                                            <th className="text-center font-IRANSansXFaNumMedium px-3 py-2.5">نسیه</th>
                                            <th className="text-center font-IRANSansXFaNumMedium px-3 py-2.5">پرداختی</th>
                                            <th className="text-center font-IRANSansXFaNumMedium px-3 py-2.5">مانده</th>
                                            <th className="text-center font-IRANSansXFaNumMedium px-3 py-2.5 rounded-l-lg print:rounded-none">وضعیت</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-var-color-06 dark:text-var-color-46 print:text-black">
                                        {data.rows.map((row, index) => (
                                            // ردیف‌ها نباید وسطِ چاپ بین دو صفحه بشکنند
                                            <tr key={row.id} className="break-inside-avoid border-b
                                                                        border-var-color-02 dark:border-var-color-38
                                                                        print:border-black/10">
                                                <td className="px-3 py-2 font-IRANSansXFaNumUltraLight">{toFaDigits(index + 1)}</td>
                                                <td className="px-3 py-2">{row.fullname}</td>
                                                <td className="px-3 py-2 text-center font-IRANSansXFaNumUltraLight">{toFaDigits(row.phone)}</td>
                                                <td className="px-3 py-2 text-center">{faNumber(row.debt)}</td>
                                                <td className="px-3 py-2 text-center">{faNumber(row.paid)}</td>
                                                <td className={`px-3 py-2 text-center font-IRANSansXFaNumMedium ${
                                                    row.code === -1 ? "text-var-color-55"
                                                        : row.code === 1 ? "text-var-color-31" : ""
                                                }`}>
                                                    {faNumber(Math.abs(row.balance))}
                                                </td>
                                                <td className="px-3 py-2 text-center text-[11.5px]">{row.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-IRANSansXFaNumMedium
                                                       text-var-color-08 dark:text-var-color-01 print:text-black
                                                       bg-var-color-59 dark:bg-var-color-52 print:bg-black/5">
                                            <td className="px-3 py-2.5 rounded-r-lg print:rounded-none" colSpan={3}>جمع کل</td>
                                            <td className="px-3 py-2.5 text-center">{faNumber(totals.debt)}</td>
                                            <td className="px-3 py-2.5 text-center">{faNumber(totals.paid)}</td>
                                            <td className="px-3 py-2.5 text-center">{faNumber(Math.abs(totals.balance))}</td>
                                            <td className="px-3 py-2.5 text-center text-[11.5px] rounded-l-lg print:rounded-none">
                                                {owed ? "طلب" : totals.balance === 0 ? "تسویه" : "بدهی"}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        <footer className="mt-6 pt-4 border-t text-[11px] flex flex-row justify-between gap-3
                                           border-var-color-02 dark:border-var-color-38 print:border-black/20
                                           text-var-color-04 dark:text-var-color-39 print:text-black/60">
                            <span>{toFaDigits(totals.debtors)} بدهکار · {toFaDigits(totals.creditors)} بستانکار · {toFaDigits(totals.transactions)} تراکنش</span>
                            <span>سامانه مدیریت مشتریان</span>
                        </footer>
                    </article>
                )}
            </div>
        </section>
    );
};

const Summary = ({label, value, unit, tone = ""}) => (
    <div className="rounded-xl px-3 py-2.5 border break-inside-avoid
                    bg-var-color-01 dark:bg-var-color-40 print:bg-transparent
                    border-var-color-02 dark:border-var-color-38 print:border-black/20">
        <p className="m-0 text-[11px] text-var-color-04 dark:text-var-color-39 print:text-black/60">{label}</p>
        <p className="m-0 mt-1 flex flex-row items-baseline gap-1 min-w-0">
            <strong className={`text-[16px] font-IRANSansXFaNumDemiBold truncate print:text-black ${
                tone || "text-var-color-08 dark:text-var-color-01"
            }`}>{value}</strong>
            <span className="text-[10px] shrink-0 text-var-color-04 dark:text-var-color-39 print:text-black/60">{unit}</span>
        </p>
    </div>
);

export default Statement;
