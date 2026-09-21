import StatsWidget from "./StatsWidget.jsx";
import TableWidget from "./TableWidget.jsx";

// ⚠️ نوعِ ناشناخته بی‌صدا نادیده گرفته می‌شود: اگر روزی سرور شکلِ تازه‌ای بفرستد
// و این فهرست به‌روز نشده باشد، جوابِ متنی باید سالم بماند — نه اینکه کلِ حباب
// با یک خطای رندر بشکند.
const RENDERERS = {
    stats: StatsWidget,
    table: TableWidget,
};

/**
 * ویجت‌های یک پاسخِ دستیار، بالای متنِ آن.
 *
 * عددهای این‌ها مستقیم از خروجیِ ابزار می‌آیند نه از متنِ مدل (`chat/widgets.py`)
 * — پس مرجعِ عدد همین‌جاست و متنِ زیرش توضیح است، نه منبع.
 *
 * ⚠️ **بالای متن است نه زیرش.** ویجت‌ها چند ثانیه بعد از سوال می‌رسند و متن روی
 * CPU چند دقیقه بعد؛ اگر زیرِ متن بودند، با هر حرفِ تازه به پایین هل داده می‌شدند.
 */
const ChatWidgets = ({widgets}) => {
    const list = (Array.isArray(widgets) ? widgets : []).filter((w) => RENDERERS[w?.type]);
    if (list.length === 0) return null;
    return (
        <div className="flex flex-col gap-2.5 mb-3">
            {list.map((widget, index) => {
                const Renderer = RENDERERS[widget.type];
                return <Renderer key={`${widget.type}-${widget.title}-${index}`} widget={widget}/>;
            })}
        </div>
    );
};

export default ChatWidgets;
