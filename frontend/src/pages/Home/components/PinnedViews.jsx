import {Suspense, lazy, useEffect, useState} from "react";
import {TbPinnedFilled, TbPinnedOff} from "react-icons/tb";
import {chatApi} from "../../../api/chat.js";
import {errorMessage} from "../../../lib/apiError.js";
import {toFaDigits} from "../../../lib/chart.js";
import {notify} from "../../../lib/notify.jsx";

// همان موتورِ رابطِ صفحهٔ گفتگو، تنبل: بدونِ سنجاق اصلاً بار نمی‌شود
const GeneratedUi = lazy(() => import("../../Chat/openui/GeneratedUi.jsx"));

/**
 * رابط‌هایی که از جواب‌های دستیار سنجاق شده‌اند — بخشی از داشبورد که خودِ کاربر با
 * پرسیدن ساخته.
 *
 * ⚠️ **بیرونِ گریدِ کاشی‌های داشبورد است، نه داخلش.** آن گرید با هر تغییرِ دوره
 * `key` عوض می‌کند و از نو ساخته می‌شود؛ سنجاق‌ها به دورهٔ داشبورد ربطی ندارند
 * (فیلترِ خودشان را دارند) و نباید با هر کلیکِ دوره دوباره Query بزنند.
 *
 * بی‌سنجاق هیچ چیزی رندر نمی‌شود — داشبورد برای قابلیتی که کاربر به کار نبرده
 * جای خالی یا راهنما نشان نمی‌دهد؛ دکمهٔ سنجاق زیرِ جواب‌های دستیار خودش پیداست.
 */
const PinnedViews = () => {
    const [pins, setPins] = useState([]);

    useEffect(() => {
        let ignore = false;
        chatApi.pins()
            .then((rows) => {
                if (!ignore) setPins(rows ?? []);
            })
            .catch(() => {});
        return () => {
            ignore = true;
        };
    }, []);

    const unpin = async (id) => {
        setPins((prev) => prev.filter((pin) => pin.id !== id));
        try {
            await chatApi.unpin(id);
        } catch (err) {
            notify(errorMessage(err, "برداشتنِ سنجاق ناموفق بود."), "error");
            chatApi.pins().then((rows) => setPins(rows ?? [])).catch(() => {});
        }
    };

    if (pins.length === 0) return null;

    return (
        <section aria-label="سنجاق‌شده‌ها" className="mb-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
            {pins.map((pin) => (
                // تکِ آخرِ یک ردیفِ دوتایی تمام‌عرض می‌شود، نه نیمه‌خالی
                <article key={pin.id} className="min-w-0 xl:last:odd:col-span-2 animate-fade-up">
                    <header className="flex flex-row items-center gap-1.5 px-1 text-[11px]
                                       text-var-color-04 dark:text-var-color-39">
                        <TbPinnedFilled className="shrink-0 w-3.5 h-3.5 text-var-color-15"/>
                        {/* برچسب همان سوالی است که این رابط را ساخت */}
                        <span className="truncate" title={pin.title}>{toFaDigits(pin.title)}</span>
                        {/* قرمزِ ویرانگر، همان جفتِ `MENU_ROW_DANGER` — معنا دارد، با پالت عوض نمی‌شود */}
                        <button type="button" onClick={() => unpin(pin.id)}
                                aria-label="برداشتن از داشبورد" title="برداشتن از داشبورد"
                                className="mr-auto shrink-0 p-1 rounded-md cursor-pointer transition-colors
                                           hover:text-var-color-28 hover:bg-var-color-26">
                            <TbPinnedOff className="w-3.5 h-3.5"/>
                        </button>
                    </header>
                    <Suspense fallback={<div className="mt-2 h-40 rounded-2xl animate-pulse
                                                        bg-var-color-01 dark:bg-var-color-36"/>}>
                        <GeneratedUi code={pin.code}/>
                    </Suspense>
                </article>
            ))}
        </section>
    );
};

export default PinnedViews;
