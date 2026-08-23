import {IoClose} from "react-icons/io5";
import {HiOutlineTrash} from "react-icons/hi2";

/**
 * نوارِ دکمه‌های پایینِ مودال‌ها — «انصراف» و دکمهٔ اقدام، کنار هم و هرکدام
 * نصفِ عرض؛ همان چیدمانی که پنلِ جستجوی تاریخ تراکنش دارد.
 *
 * در RTL اولین فرزند راست‌ترین است، پس «انصراف» سمت راست و اقدام سمت چپ می‌نشیند.
 *
 * حالتِ حذف استثناست و تک‌دکمه‌ای می‌ماند: آنجا دکمهٔ اقدام خودش قرمز است و
 * گذاشتنِ یک «انصراف»ِ قرمز کنارش یعنی دو دکمهٔ هم‌رنگ که یکی حذف می‌کند و یکی
 * نه — همان چیزی که کاربر باید یک نگاه بفهمد.
 *
 * در یک فایل جمع است تا مودالِ مشتری و مودالِ تراکنش دو نسخهٔ واگرا نشوند.
 */
const ModalActions = ({mode, config, submitting, onSubmit, onCancel}) => {
    const isDelete = mode === "delete";
    const SubmitIcon = isDelete ? HiOutlineTrash : config.icon;

    // ارتفاعِ همهٔ دکمه‌های فوتر یکی است — همان ارتفاعی که دکمهٔ مودالِ حذف داشت.
    // با ارتفاعِ صریح، به اندازهٔ متن و آیکونِ هر حالت گره نمی‌خورد.
    const buttonBase = "h-10 rounded-xl btn disabled:opacity-60 disabled:cursor-not-allowed";

    return (
        <footer className={`flex flex-row items-center gap-2 ${isDelete ? "justify-end mt-3.5" : "justify-between mt-1"}`}>
            {!isDelete && (
                <button
                    type="button"
                    tabIndex={-1}
                    disabled={submitting}
                    onClick={onCancel}
                    className={`w-1/2 ${buttonBase} btn-redish`}
                >
                    <IoClose className="w-5 h-5 ml-1"/>
                    <span className="text-[15px]">انصراف</span>
                </button>
            )}

            <button
                type="button"
                tabIndex={-1}
                disabled={submitting}
                onClick={onSubmit}
                className={`${isDelete ? "px-4" : "w-1/2"} ${buttonBase} ${config.button}`}
            >
                <SubmitIcon className={config.submitIcon}/>
                <span className="text-[15px]">{submitting ? "در حال انجام ..." : config.submit}</span>
            </button>
        </footer>
    );
};

export default ModalActions;
