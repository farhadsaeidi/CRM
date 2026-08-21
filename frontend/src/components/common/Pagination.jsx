import {useMemo} from "react";
import {FiChevronLeft, FiChevronRight} from "react-icons/fi";

// چیدمانِ صفحه‌بندی عیناً همان پروژهٔ CustomerManagement است: دکمه‌های گرد،
// صفحهٔ جاری پررنگ، و سه‌نقطه وقتی فاصله زیاد است.
const buildPaginationItems = (currentPage, numPages) => {
    const items = [];
    const hasPrevious = currentPage > 1;
    const hasNext = currentPage < numPages;

    if (hasPrevious && currentPage > 2) {
        items.push({type: "page", pageNumber: 1, isActive: false, key: "first-page"});
        if (currentPage > 3) items.push({type: "ellipsis", key: "start-ellipsis"});
    }
    for (let num = 1; num <= numPages; num += 1) {
        if (num === currentPage) items.push({type: "page", pageNumber: num, isActive: true, key: `page-${num}`});
        else if (num > currentPage - 2 && num < currentPage + 2) {
            items.push({type: "page", pageNumber: num, isActive: false, key: `page-${num}`});
        }
    }
    if (hasNext) {
        if (currentPage < numPages - 2) {
            items.push({type: "ellipsis", key: "end-ellipsis"});
            items.push({type: "page", pageNumber: numPages, isActive: false, key: "last-page"});
        } else if (currentPage < numPages - 1) {
            items.push({type: "page", pageNumber: numPages, isActive: false, key: "last-page"});
        }
    }
    return items;
};

export default function Pagination({page = 1, totalPages = 1, onPageClick}) {
    const items = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages]);
    const changePage = (pageNumber) => {
        if (typeof onPageClick === "function" && pageNumber) onPageClick(pageNumber);
    };

    return (
        <footer className="p-4 border-t border-var-color-57 dark:border-var-color-38 flex items-center justify-center bg-var-color-00 dark:bg-var-color-43">
            <div className="flex items-center gap-1">
                {page > 1 && (
                    <button className="w-8 h-8 ml-0.5 rounded-full btn btn-bluish" type="button"
                            onClick={() => changePage(page - 1)} aria-label="صفحه قبل">
                        <FiChevronRight className="w-4.5 h-4.5"/>
                    </button>
                )}

                {items.map((item) =>
                    item.type === "ellipsis" ? (
                        <span key={item.key} className="px-1 text-var-color-15">...</span>
                    ) : (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => changePage(item.pageNumber)}
                            aria-current={item.isActive ? "page" : undefined}
                            className={item.isActive
                                ? "w-9 h-9 flex items-center justify-center rounded-full bg-var-color-15 text-var-color-00 dark:text-var-color-03 font-bold text-sm mx-0.5 transition-all duration-150 ease-in-out"
                                : "w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium btn btn-bluish mx-0.5"}
                        >
                            {item.pageNumber}
                        </button>
                    )
                )}

                {page < totalPages && (
                    <button className="w-8 h-8 ml-0.5 rounded-full btn btn-bluish" type="button"
                            onClick={() => changePage(page + 1)} aria-label="صفحه بعد">
                        <FiChevronLeft className="w-4.5 h-4.5"/>
                    </button>
                )}
            </div>
        </footer>
    );
}
