import {FiChevronRight, FiChevronLeft} from "react-icons/fi";

// در RTL جهتِ آیکون‌ها برعکسِ شهود است: «قبلی» به راست اشاره می‌کند.
const PAGE_WINDOW = 2; // چند صفحه دو طرفِ صفحهٔ جاری نشان داده شود

const buildPages = (current, total) => {
    if (total <= 1) return [];
    const pages = new Set([1, total]);
    for (let i = current - PAGE_WINDOW; i <= current + PAGE_WINDOW; i += 1) {
        if (i >= 1 && i <= total) pages.add(i);
    }
    const sorted = [...pages].sort((a, b) => a - b);
    // جای شکاف‌ها «…» گذاشته می‌شود تا نوار با صد صفحه هم کوتاه بماند
    const out = [];
    let previous = 0;
    for (const page of sorted) {
        if (previous && page - previous > 1) out.push({gap: true, key: `gap-${page}`});
        out.push({page, key: page});
        previous = page;
    }
    return out;
};

const Pagination = ({page, totalPages, onChange}) => {
    if (totalPages <= 1) return null;
    const items = buildPages(page, totalPages);

    const btn = "min-w-8 h-8 px-2 rounded-lg text-sm border transition-all duration-200 ease-in-out";
    const idle = "bg-var-color-00 dark:bg-var-color-37 border-var-color-02 dark:border-var-color-38 text-var-color-06 dark:text-var-color-03 enabled:hover:border-var-color-15 enabled:hover:text-var-color-15 enabled:cursor-pointer";
    const disabled = "disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <nav className="flex flex-row-reverse justify-center items-center gap-1.5 flex-wrap" aria-label="صفحه‌بندی">
            <button type="button" className={`${btn} ${idle} ${disabled} flex items-center justify-center`}
                    disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="صفحه قبل">
                <FiChevronRight className="w-4 h-4"/>
            </button>

            {items.map((item) =>
                item.gap ? (
                    <span key={item.key} className="px-1 text-var-color-04 dark:text-var-color-05 select-none">…</span>
                ) : (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onChange(item.page)}
                        aria-current={item.page === page ? "page" : undefined}
                        className={`${btn} ${item.page === page
                            ? "bg-var-color-15 border-var-color-15 text-var-color-00 cursor-default"
                            : `${idle} cursor-pointer`}`}
                    >
                        {item.page.toLocaleString("fa-IR")}
                    </button>
                )
            )}

            <button type="button" className={`${btn} ${idle} ${disabled} flex items-center justify-center`}
                    disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="صفحه بعد">
                <FiChevronLeft className="w-4 h-4"/>
            </button>
        </nav>
    );
};

export default Pagination;
