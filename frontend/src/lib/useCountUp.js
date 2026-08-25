import {useEffect, useRef, useState} from "react";

/**
 * شمارشِ انیمیشنیِ عدد از صفر تا مقدارِ نهایی.
 *
 * چرا از صفر و نه از مقدارِ قبلی؟ کاشی‌های داشبورد با هر بازخوانی `key` تازه
 * می‌گیرند و از نو mount می‌شوند تا انیمیشنِ ورود دوباره پخش شود؛ در آن لحظه
 * «مقدارِ قبلی» وجود ندارد.
 *
 * ⚠️ setState داخل rAF است نه در بدنهٔ افکت — قاعدهٔ set-state-in-effect.
 */
export const useCountUp = (target, duration = 900) => {
    const [value, setValue] = useState(0);
    const frameRef = useRef(0);

    useEffect(() => {
        const to = Number(target) || 0;
        const startedAt = performance.now();

        const tick = (now) => {
            const progress = duration > 0 ? Math.min(1, (now - startedAt) / duration) : 1;
            // easeOutCubic: تندِ اول و آرامِ آخر — عدد «می‌نشیند» به‌جای اینکه بپرد
            const eased = 1 - (1 - progress) ** 3;
            setValue(Math.round(to * eased));
            if (progress < 1) frameRef.current = requestAnimationFrame(tick);
        };

        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration]);

    return value;
};
