import {useState} from "react";
import {FiCheck, FiCopy, FiGitBranch, FiRotateCcw} from "react-icons/fi";
import CustomTooltip from "../../../components/common/CustomTooltip.jsx";
import {fullDateTime, relativeTime} from "../../../lib/datetime.js";

/**
 * نوارِ کوچکِ زیرِ پیامِ کاربر: زمان، کپی، بازگشت، انشعاب.
 *
 * ⚠️ **تولتیپ شناور است، نه شبه‌عنصر.** این نوار داخلِ `ScrollContainer` است و
 * کتابخانه یک عنصرِ viewport با overflow دورش می‌گذارد؛ تولتیپِ `::after` همان
 * جا بریده می‌شد. `CustomTooltip` با مختصاتِ صفحه کار می‌کند و از هر قابی بیرون
 * می‌زند — همان راهی که دکمهٔ بازگشتِ سایدبار رفت.
 *
 * ⚠️ هر نوار تولتیپِ خودش را دارد ولی این گران نیست: `CustomTooltip` با
 * `pos === null` بی‌درنگ `null` برمی‌گرداند، و در هر لحظه فقط یک پیام هاور است.
 */
const MessageActions = ({created, body, onCopy, onRewind, onFork}) => {
    const [tip, setTip] = useState({text: "", pos: null});
    const [copied, setCopied] = useState(false);

    const show = (text) => (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setTip({text, pos: {top: rect.top, left: rect.left + rect.width / 2}});
    };
    const hide = () => setTip((t) => ({...t, pos: null}));

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(body);
            setCopied(true);
            // برگشت به حالتِ اول، وگرنه تیک تا آخرِ عمرِ صفحه می‌ماند و دفعهٔ
            // بعد معلوم نیست کپی شد یا نه
            setTimeout(() => setCopied(false), 1600);
            onCopy?.();
        } catch {
            onCopy?.(false);
        }
    };

    const actions = [
        {key: "copy", tip: copied ? "کپی شد" : "کپی", onClick: copy,
         icon: copied ? FiCheck : FiCopy},
        {key: "rewind", tip: "بازگشت به اینجا", onClick: onRewind, icon: FiRotateCcw},
        {key: "fork", tip: "انشعاب از اینجا", onClick: onFork, icon: FiGitBranch},
    ];

    return (
        // ⚠️ `opacity` و نه `hidden`: با حذف و افزودنِ عنصر، ارتفاعِ حباب موقعِ
        // هاور می‌پرید و کلِ گفتگو یک پرشِ کوچک می‌خورد. جا همیشه گرفته است و
        // فقط دیده نمی‌شود. `pointer-events-none` هم لازم است تا در حالتِ نامرئی
        // کلیک نگیرد.
        <div className="flex items-center gap-0.5 mt-1 opacity-0 pointer-events-none
                        transition-opacity duration-200
                        group-hover:opacity-100 group-hover:pointer-events-auto
                        focus-within:opacity-100 focus-within:pointer-events-auto">
            {/* زمانِ نسبی، با تاریخِ کاملِ شمسی در تولتیپ. خودش دکمه نیست، پس
                `span` می‌ماند و فقط تولتیپ می‌گیرد. */}
            <span onMouseEnter={show(fullDateTime(created))} onMouseLeave={hide}
                  className="px-1.5 text-[10.5px] whitespace-nowrap cursor-default
                             text-var-color-04 dark:text-var-color-39">
                {relativeTime(created)}
            </span>

            {actions.map(({key, tip: text, onClick, icon: Icon}) => (
                <button key={key} type="button" aria-label={text} onClick={onClick}
                        onMouseEnter={show(text)} onMouseLeave={hide} onBlur={hide}
                        className="w-6.5 h-6.5 rounded-full flex items-center justify-center
                                   cursor-pointer transition-all duration-200 active:scale-90
                                   text-var-color-05 dark:text-var-color-46
                                   hover:bg-var-color-01 dark:hover:bg-var-color-40
                                   hover:text-var-color-06 dark:hover:text-var-color-01">
                    <Icon className="w-3.5 h-3.5"/>
                </button>
            ))}

            <CustomTooltip text={tip.text} pos={tip.pos} visible={Boolean(tip.pos)}/>
        </div>
    );
};

export default MessageActions;
