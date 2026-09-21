import StatTile from "./StatTile.jsx";
import {TILE_GRID} from "./widgetFormat.js";
import WidgetFrame from "./WidgetFrame.jsx";

/**
 * کارتِ چند عدد — نمای کلی، وضعیتِ مشتریان، حسابِ یک مشتری.
 *
 * ⚠️ کاشی‌ها خانهٔ جدا دارند نه خطِ جداکننده: با `gap-px` روی زمینهٔ رنگی، خانهٔ
 * خالیِ ردیفِ آخر (پنج عدد در گریدِ دو یا سه‌ستونه) یک مستطیلِ توپر به رنگِ
 * خط می‌شد.
 */
const StatsWidget = ({widget}) => (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle} link={widget.link}>
        <div className={TILE_GRID}>
            {(widget.items ?? []).map((item) => <StatTile key={item.label} {...item}/>)}
        </div>
    </WidgetFrame>
);

export default StatsWidget;
