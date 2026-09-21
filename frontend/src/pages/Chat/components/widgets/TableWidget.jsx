import DataTable from "./DataTable.jsx";
import WidgetFrame from "./WidgetFrame.jsx";

/**
 * جدولِ کوچک — بدهکاران، آخرین تراکنش‌ها، خوش‌حساب‌ها، …
 *
 * بدنه‌اش (`DataTable`) با جدولی که مدل در رابط می‌سازد مشترک است.
 */
const TableWidget = ({widget}) => (
    <WidgetFrame title={widget.title} subtitle={widget.subtitle} link={widget.link}>
        <DataTable columns={widget.columns ?? []} rows={widget.rows ?? []} total={widget.total}/>
    </WidgetFrame>
);

export default TableWidget;
