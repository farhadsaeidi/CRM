import {useId, useRef, useState} from "react";
import toast from "react-hot-toast";
import {FiCheck, FiShoppingBag} from "react-icons/fi";
import ModalActions from "./ModalActions.jsx";
import ModalCloseButton from "./ModalCloseButton.jsx";
import {authApi} from "../../api/auth.js";
import {useAuth} from "../../context/AuthContext.js";
import {notify, notifyLoading} from "../../lib/notify.jsx";

const MAX_LENGTH = 40;

/**
 * گرفتنِ نامِ کسب‌وکار — فقط بارِ اول.
 *
 * چرا در ثبت‌نام پرسیده نمی‌شود؟ چون تنها جایی که به آن نیاز است متنِ پیامکِ
 * یادآوری است، و بیشترِ مالکان هرگز پیامک نمی‌فرستند. یک فیلدِ اضافه در فرمِ
 * ثبت‌نام برای همه، تا یک قابلیت برای بعضی کار کند، معاملهٔ بدی است.
 *
 * ⚠️ نوعِ کسب‌وکار داخلِ خودِ نام نوشته می‌شود («سوپرمارکت رضا»)، پس متنِ پیامک
 * هیچ کلمه‌ای جلویش نمی‌گذارد — وگرنه «فروشگاه سوپرمارکت رضا» می‌شد.
 */
const BusinessNameModal = ({open, onClose, onSaved}) => {
    const id = useId();
    const inputRef = useRef(null);
    const {user, setUser} = useAuth();

    const [value, setValue] = useState(user?.business_name ?? "");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // با هر بار باز شدن، مقدار از حسابِ کاربر تازه خوانده شود — «state مشتق از
    // props» با مقایسه در حین رندر، نه با افکت
    const [wasOpen, setWasOpen] = useState(open);
    if (wasOpen !== open) {
        setWasOpen(open);
        if (open) {
            setValue(user?.business_name ?? "");
            setError("");
            setIsClosing(false);
        }
    }

    const requestClose = () => setIsClosing(true);
    const handleAnimationEnd = () => {
        if (isClosing) onClose();
    };

    const submit = async () => {
        const name = value.trim();
        if (name.length < 2) {
            setError("نام کسب‌وکار باید حداقل ۲ حرف باشد.");
            inputRef.current?.focus();
            return;
        }

        setSubmitting(true);
        const loadingId = notifyLoading();
        try {
            const res = await authApi.updateProfile({business_name: name});
            toast.dismiss(loadingId);
            setUser(res.userData);
            notify("نام کسب‌وکار ذخیره شد.", "success");
            onSaved?.(name);
            requestClose();
        } catch (err) {
            toast.dismiss(loadingId);
            const data = err?.data || {};
            const message = data.fieldErrors?.business_name || data.message || "ذخیرهٔ نام ناموفق بود.";
            setError(message);
            notify(message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-3
                        bg-black/50 backdrop-blur-sm dark:bg-black/40 dark:backdrop-blur-lg"
             onClick={requestClose} role="dialog" aria-modal="true" aria-label="نام کسب‌وکار">
            <form
                onClick={(e) => e.stopPropagation()}
                onAnimationEnd={handleAnimationEnd}
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
                autoComplete="off"
                className={`relative w-full max-w-100 rounded-[18px] p-4 2xs:p-5 flex flex-col gap-3.5
                            bg-var-color-00 dark:bg-var-color-37
                            border border-var-color-02 dark:border-var-color-38
                            shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] ${
                    isClosing ? "animate-modal-out" : "animate-modal-in"
                }`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex flex-row justify-start items-center gap-2 min-w-0">
                        <span className="w-7 h-7 shrink-0 flex justify-center items-center rounded-full
                                         text-var-color-01 dark:text-var-color-15
                                         bg-var-color-15 dark:bg-var-color-12
                                         border border-var-color-15 dark:border-var-color-42">
                            <FiShoppingBag className="w-3.5 h-3.5"/>
                        </span>
                        <h3 className="m-0 text-[16px] font-IRANSansXFaNumDemiBold truncate
                                       text-var-color-06 dark:text-var-color-01">
                            نام فروشگاه / سوپرمارکت / بنگاه / …
                        </h3>
                    </div>
                    <ModalCloseButton size="sm" onClick={requestClose}/>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="relative w-full h-11">
                        <FiShoppingBag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
                                                  text-var-color-15 pointer-events-none"/>
                        <input
                            id={id + "business"}
                            ref={inputRef}
                            type="text"
                            autoFocus
                            maxLength={MAX_LENGTH}
                            value={value}
                            placeholder="مثلاً: سوپرمارکت رضا"
                            onChange={(e) => {
                                setValue(e.target.value);
                                setError("");
                            }}
                            className={`w-full h-full text-[14px] pr-9.5 pl-14 rounded-xl
                                        input input-bluish input-placeholder ${error ? "input-error" : ""}`}
                        />
                        {/* شمارندهٔ کاراکتر — سقف از خودِ پیامک می‌آید، نه سلیقه */}
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px]
                                         font-IRANSansXFaNumUltraLight pointer-events-none
                                         text-var-color-04 dark:text-var-color-39">
                            {value.length}/{MAX_LENGTH}
                        </span>
                    </div>

                    {error ? (
                        <p className="m-0 text-[11.5px] text-var-color-28">{error}</p>
                    ) : (
                        <p className="m-0 text-[11.5px] leading-6 text-var-color-04 dark:text-var-color-39">
                            این نام در متنِ پیامک برای مشتری فرستاده می‌شود تا بداند یادآوری از طرفِ
                            کیست، پس <span className="text-var-color-15">وارد کردنش برای ارسال پیامک
                            الزامی است</span>. نوعِ کسب‌وکار را هم داخلِ همین نام بنویسید؛ یک بار
                            ذخیره می‌شود و دفعهٔ بعد دیگر پرسیده نمی‌شود.
                        </p>
                    )}
                </div>

                <ModalActions
                    mode="create"
                    config={{icon: FiCheck, submit: "ذخیره", button: "btn-bluish",
                             submitIcon: "w-4.5 h-4.5 ml-1.5"}}
                    submitting={submitting}
                    onSubmit={submit}
                    onCancel={requestClose}
                />
            </form>
        </div>
    );
};

export default BusinessNameModal;
