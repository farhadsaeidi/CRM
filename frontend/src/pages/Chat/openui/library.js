import {createLibrary, createParser} from "@openuidev/react-lang";
import {buildComponents, COMPONENT_GROUPS, ROOT} from "./defs.js";
import {
    UiBarChart, UiCard, UiDonutChart, UiKpi, UiKpiGrid, UiLineChart, UiNote, UiSelect, UiStack, UiTable,
} from "./components.jsx";

// همان تعریف‌هایی که پرامپتِ مدل از رویشان ساخته شده (`scripts/openui-prompt.mjs`)،
// این بار با رندرکننده‌های واقعی. آنچه مدل وعده گرفته دقیقاً همانی است که صفحه می‌شناسد.
export const library = createLibrary({
    root: ROOT,
    componentGroups: COMPONENT_GROUPS,
    components: buildComponents({
        Stack: UiStack, Card: UiCard, KpiGrid: UiKpiGrid, Kpi: UiKpi, Table: UiTable,
        BarChart: UiBarChart, LineChart: UiLineChart, DonutChart: UiDonutChart,
        Select: UiSelect, Note: UiNote,
    }),
});

// برای تصمیمِ «رابط ساخته شد یا نه» پیش از رندر — `GeneratedUi`
export const parser = createParser(library.toJSONSchema());
