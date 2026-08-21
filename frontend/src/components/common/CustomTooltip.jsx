// تولتیپِ شناور — بیرون از هر کانتینری رندر می‌شود و موقعیتش با مختصاتِ صفحه
// داده می‌شود.
//
// چرا به‌جای کلاسِ `custom-tooltip`؟ آن کلاس تولتیپ را با شبه‌عنصرِ ::after روی
// خودِ دکمه می‌سازد، و هر جدّی که `overflow-hidden` داشته باشد بخشِ بیرون‌زدهٔ آن
// را می‌بُرد. کارتِ جدول برای گردیِ گوشه‌ها overflow-hidden دارد، پس تولتیپِ
// دکمه‌های نوارِ بالای جدول نصفه دیده می‌شد.
export default function CustomTooltip({text, pos, visible}) {
    if (!pos) return null;

    const shared = {
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        opacity: visible ? 1 : 0,
        pointerEvents: "none",
        transition: "opacity 0.15s ease, translate 0.15s ease",
    };

    return (
        <section className="fixed pointer-events-none z-[1000]" style={{top: pos.top, left: pos.left}}>
            <div
                style={{
                    ...shared,
                    bottom: "calc(100% + 8px)",
                    maxWidth: "220px",
                    padding: "5px 8px",
                    fontSize: "13px",
                    color: "var(--color-var-color-01)",
                    textAlign: "center",
                    backgroundColor: "var(--color-var-color-11)",
                    borderRadius: "6px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    translate: visible ? "0 0" : "0 4px",
                }}
            >
                {text}
            </div>
            {/* مثلثِ زیرِ تولتیپ */}
            <span
                style={{
                    ...shared,
                    bottom: "calc(100% + 2px)",
                    borderWidth: "8px 8px 0 8px",
                    borderStyle: "solid",
                    borderColor: "var(--color-var-color-11) transparent transparent transparent",
                    translate: visible ? "0 0" : "0 6px",
                }}
            />
        </section>
    );
}
