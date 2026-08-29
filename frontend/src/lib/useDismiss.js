import {useEffect} from "react";

/**
 * بستنِ یک لایهٔ شناور با کلیکِ بیرون، Esc، و (اختیاری) اسکرول.
 *
 * سه کشو و منو در صفحهٔ گفتگو همین سه رفتار را می‌خواستند و نسخهٔ اولشان هر کدام
 * یک `useEffect` با همان دو `addEventListener` داشت. جدا نگه‌داشتنشان یعنی هر
 * اصلاحی (مثلاً افزودنِ بستن با اسکرول) باید در چند جا تکرار شود و یکی‌شان
 * جا بماند.
 *
 * @param open آیا لایه باز است
 * @param onClose بستن
 * @param ref عنصری که کلیکِ **داخلش** نباید ببندد
 * @param onScroll آیا اسکرول هم ببندد — برای لایه‌های `fixed` که با محتوا
 *        جابه‌جا نمی‌شوند و با اسکرولِ فهرست از دکمه‌شان جدا می‌افتند
 */
export function useDismiss(open, onClose, ref, {onScroll = false} = {}) {
    useEffect(() => {
        if (!open) return undefined;

        const onDown = (event) => {
            if (!ref.current?.contains(event.target)) onClose();
        };
        const onKey = (event) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        // ⚠️ فازِ capture لازم است: رویدادِ scroll حباب نمی‌کند، پس بدونِ آن
        // اسکرولِ یک ناحیهٔ درونی (مثل فهرستِ گفتگوها) اصلاً به document نمی‌رسد.
        if (onScroll) document.addEventListener("scroll", onClose, true);

        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
            if (onScroll) document.removeEventListener("scroll", onClose, true);
        };
    }, [open, onClose, ref, onScroll]);
}
