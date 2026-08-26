import {useEffect, useState} from "react";
import toast from "react-hot-toast";
import {FiCheck, FiClock, FiMessageSquare, FiSend} from "react-icons/fi";
import ModalActions from "./ModalActions.jsx";
import ModalCloseButton from "./ModalCloseButton.jsx";
import ScrollContainer from "./ScrollContainer.jsx";
import RowSelectMark from "./RowSelectMark.jsx";
import {remindersApi} from "../../api/reminders.js";
import {faNumber, toFaDigits} from "../../lib/chart.js";
import {OPEN_BUSINESS_NAME_EVENT} from "../../lib/events.js";
import {notify, notifyLoading} from "../../lib/notify.jsx";

/**
 * انتخابِ بدهکاران و ارسالِ یادآوریِ پیامکی.
 *
 * چرا مودال و نه صفحه؟ این یک **کار** است نه یک مقصد: کاربر باز می‌کند، چند نفر
 * را تیک می‌زند، می‌فرستد و برمی‌گردد سرِ کارِ قبلی‌اش. صفحهٔ جدا او را از جایی
 * که بود بیرون می‌برد بی‌آنکه چیزی اضافه کند.
 *
 * ⚠️ پیامک پول دارد و به آدمِ واقعی می‌رسد، پس هیچ‌چیز پیش‌فرض تیک‌خورده نیست و
 * تعدادِ انتخاب‌شده روی خودِ دکمهٔ ارسال نوشته می‌شود.
 */
const DebtReminderModal = ({open, onClose}) => {
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(() => new Set());
    const [sending, setSending] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [wasOpen, setWasOpen] = useState(open);
    if (wasOpen !== open) {
        setWasOpen(open);
        if (open) {
            setData(null);
            setSelected(new Set());
            setIsClosing(false);
        }
    }

    useEffect(() => {
        if (!open) return;
        let ignore = false;
        remindersApi.debtors()
            .then((res) => {
                if (!ignore) setData(res);
            })
            .catch(() => {
                if (ignore) return;
                notify("دریافت فهرست بدهکاران ناموفق بود.", "error");
            });
        return () => {
            ignore = true;
        };
    }, [open, reloadKey]);

    const requestClose = () => setIsClosing(true);
    const handleAnimationEnd = () => {
        if (isClosing) onClose();
    };

    const rows = data?.rows ?? [];
    // مشتری‌ای که به‌تازگی یادآوری گرفته اصلاً قابلِ انتخاب نیست
    const selectable = rows.filter((row) => !row.recently_reminded);
    const allSelected = selectable.length > 0 && selectable.every((row) => selected.has(row.id));

    const toggle = (id) => setSelected((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const toggleAll = () => setSelected(
        allSelected ? new Set() : new Set(selectable.map((row) => row.id))
    );

    const submit = async () => {
        if (selected.size === 0) {
            notify("حداقل یک مشتری را انتخاب کنید.", "error");
            return;
        }

        setSending(true);
        const loadingId = notifyLoading();
        try {
            const res = await remindersApi.send([...selected]);
            toast.dismiss(loadingId);

            // ⚠️ یک پیغام، نه سه‌تا: `notify` اول همهٔ پیغام‌های قبلی را می‌بندد،
            // پس دو فراخوانِ پشتِ هم یعنی کاربر فقط آخری را می‌بیند.
            const sentCount = res.sent?.length ?? 0;
            const failedCount = res.failed?.length ?? 0;
            if (sentCount && failedCount) {
                notify(`${toFaDigits(sentCount)} پیامک ارسال شد، ${toFaDigits(failedCount)} ناموفق بود.`, "warning");
            } else if (sentCount) {
                notify(`${toFaDigits(sentCount)} پیامک ارسال شد.`, "success");
            } else if (failedCount) {
                notify("ارسال پیامک ناموفق بود.", "error");
            } else {
                notify("چیزی ارسال نشد.", "info");
            }

            setSelected(new Set());
            setReloadKey((key) => key + 1);   // بازهٔ خاموشی تازه شود
        } catch (err) {
            toast.dismiss(loadingId);
            const body = err?.data || {};
            notify(body.message || "ارسال پیامک ناموفق بود.", "error");
            // اگر نامِ کسب‌وکار پاک شده باشد سرور همین را می‌گوید؛ به‌جای بن‌بست،
            // همان مودالِ نام باز می‌شود
            if (body.needsBusinessName) {
                requestClose();
                window.dispatchEvent(new CustomEvent(OPEN_BUSINESS_NAME_EVENT));
            }
        } finally {
            setSending(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-3
                        bg-black/50 backdrop-blur-sm dark:bg-black/40 dark:backdrop-blur-lg"
             onClick={requestClose} role="dialog" aria-modal="true" aria-label="یادآوری پیامکی به بدهکاران">
            <section
                onClick={(e) => e.stopPropagation()}
                onAnimationEnd={handleAnimationEnd}
                className={`relative w-full max-w-115 max-h-[calc(100vh-1.5rem)] rounded-[18px] p-4 2xs:p-5
                            flex flex-col gap-3.5
                            bg-var-color-00 dark:bg-var-color-37
                            border border-var-color-02 dark:border-var-color-38
                            shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] ${
                    isClosing ? "animate-modal-out" : "animate-modal-in"
                }`}
            >
                <header className="shrink-0 flex items-center justify-between gap-3">
                    <div className="flex flex-row justify-start items-center gap-2 min-w-0">
                        <span className="w-7 h-7 shrink-0 flex justify-center items-center rounded-full
                                         text-var-color-01 dark:text-var-color-15
                                         bg-var-color-15 dark:bg-var-color-12
                                         border border-var-color-15 dark:border-var-color-42">
                            <FiMessageSquare className="w-3.5 h-3.5"/>
                        </span>
                        <div className="min-w-0">
                            <h3 className="m-0 text-[16px] font-IRANSansXFaNumDemiBold truncate
                                           text-var-color-06 dark:text-var-color-01">یادآوری به بدهکاران</h3>
                            {data && (
                                <p className="m-0 text-[11px] truncate text-var-color-04 dark:text-var-color-39">
                                    از طرفِ {data.business_name}
                                </p>
                            )}
                        </div>
                    </div>
                    <ModalCloseButton size="sm" onClick={requestClose}/>
                </header>

                {!data ? (
                    <div className="flex flex-col gap-2 py-2">
                        {[0, 1, 2].map((index) => (
                            <div key={index} className="animate-pulse h-12 rounded-xl
                                                        bg-var-color-01 dark:bg-var-color-40"/>
                        ))}
                    </div>
                ) : rows.length === 0 ? (
                    <p className="m-0 py-10 text-center text-[13px] text-var-color-04 dark:text-var-color-39">
                        هیچ مشتری‌ای بدهکار نیست 🎉
                    </p>
                ) : (
                    <>
                        <div className="shrink-0 flex flex-row items-center justify-between gap-3
                                        pb-2.5 border-b border-var-color-02 dark:border-var-color-38">
                            <button type="button" onClick={toggleAll}
                                    className="flex flex-row items-center gap-2 cursor-pointer text-[12.5px]
                                               text-var-color-06 dark:text-var-color-01">
                                <RowSelectMark selected={allSelected}/>
                                انتخاب همه
                            </button>
                            <span className="text-[11.5px] text-var-color-04 dark:text-var-color-39">
                                {toFaDigits(rows.length)} بدهکار · {faNumber(data.total.amount)} تومان
                            </span>
                        </div>

                        <ScrollContainer className="flex-1 min-h-0 max-h-80" overflowX="hidden" trackPadding={10}>
                            <ul className="m-0 p-0 pl-2 list-none flex flex-col gap-1">
                                {rows.map((row) => {
                                    const blocked = row.recently_reminded;
                                    return (
                                        <li key={row.id}>
                                            {/* enabled: لازم است چون هاور روی دکمهٔ disabled هم اعمال می‌شود */}
                                            <button
                                                type="button"
                                                disabled={blocked}
                                                onClick={() => toggle(row.id)}
                                                className="w-full text-right rounded-xl px-2.5 py-2 min-w-0
                                                           flex flex-row items-center gap-2.5
                                                           transition-colors duration-200
                                                           enabled:cursor-pointer disabled:opacity-45
                                                           disabled:cursor-not-allowed
                                                           enabled:hover:bg-var-color-01
                                                           dark:enabled:hover:bg-var-color-40"
                                            >
                                                <RowSelectMark selected={selected.has(row.id)}/>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[12.5px]
                                                                     text-var-color-06 dark:text-var-color-01">
                                                        {row.fullname}
                                                    </span>
                                                    <span className="block mt-0.5 text-[10px]
                                                                     font-IRANSansXFaNumUltraLight
                                                                     text-var-color-04 dark:text-var-color-39">
                                                        {toFaDigits(row.phone)}
                                                        {row.days !== null && ` · ${toFaDigits(row.days)} روز`}
                                                    </span>
                                                </span>
                                                {blocked ? (
                                                    <span className="shrink-0 flex flex-row items-center gap-1
                                                                     px-2 py-0.5 rounded-full text-[10px]
                                                                     bg-var-color-54 text-var-color-53">
                                                        <FiClock className="w-3 h-3"/>
                                                        ارسال شده
                                                    </span>
                                                ) : (
                                                    <span className="shrink-0 text-[12.5px]
                                                                     font-IRANSansXFaNumMedium text-var-color-55">
                                                        {faNumber(row.amount)}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </ScrollContainer>

                        <p className="m-0 shrink-0 text-[11px] leading-6 text-var-color-04 dark:text-var-color-39">
                            به هر مشتری حداکثر یک بار در {toFaDigits(data.cooldown_hours)} ساعت یادآوری
                            فرستاده می‌شود؛ کسانی که به‌تازگی پیامک گرفته‌اند قابلِ انتخاب نیستند.
                        </p>

                        <ModalActions
                            mode="create"
                            config={{
                                icon: selected.size ? FiSend : FiCheck,
                                submit: selected.size
                                    ? `ارسال به ${toFaDigits(selected.size)} نفر`
                                    : "ارسال پیامک",
                                button: "btn-bluish",
                                submitIcon: "w-4.5 h-4.5 ml-1.5",
                            }}
                            submitting={sending}
                            onSubmit={submit}
                            onCancel={requestClose}
                        />
                    </>
                )}
            </section>
        </div>
    );
};

export default DebtReminderModal;
