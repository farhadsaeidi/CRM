import {useEffect, useRef, useState} from "react";
import toast from "react-hot-toast";
import { PiPauseDuotone } from "react-icons/pi";
import { FaPlay } from "react-icons/fa";
import { IoClose } from "react-icons/io5";


export default function ProgressToast({t, message, type = "info", duration = 3000}) {
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);

    const remainingRef = useRef(duration);
    const lastTimeRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        lastTimeRef.current = performance.now();

        const tick = (now) => {
            if (paused) {
                lastTimeRef.current = now;
                rafRef.current = requestAnimationFrame(tick);
                return;
            }
            const elapsed = now - lastTimeRef.current;
            lastTimeRef.current = now;
            remainingRef.current = Math.max(0, remainingRef.current - elapsed);
            const p = 1 - remainingRef.current / duration;
            setProgress(p);
            if (remainingRef.current <= 0 && !paused) {
                toast.dismiss(t.id);
                return;
            }
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [paused, duration, t.id]);

    const handlePauseToggle = () => {
        setPaused((v) => !v);
    };

    const handleClose = () => {
        toast.dismiss(t.id);
    };

    /* ⏱️ انیمیشن خروج */
    useEffect(() => {
        if (!t.visible) {
            const timer = setTimeout(() => {
                toast.remove(t.id);
            }, 110);
            return () => clearTimeout(timer);
        }
    }, [t.visible, t.id]);

    return (
        <section className={`w-fit max-w-[calc(100vw-1rem)] px-2.5 py-2 rounded-lg text-sm bg-var-color-00 dark:bg-var-color-09 border border-var-color-02 dark:border-var-color-07 shadow-var-shadow-04 dark:shadow-var-shadow-05 ${t.visible ? "toast-enter" : "toast-leave"}`}>
            <header className="flex flex-row items-center">
                {/* آیکون */}
                <div className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full ml-2.5
                ${type === "success" ? "bg-green-500 dark:bg-var-color-29 border border-transparent dark:border-var-color-30" : type === "error" ? "bg-red-500 dark:bg-var-color-26 border border-transparent dark:border-var-color-27" : type === "warning" ? "bg-transparent dark:bg-transparent border border-transparent" : type === "info" ? "bg-var-color-19 dark:bg-var-color-17 border border-transparent dark:border-var-color-18" : null}
                ${type === "error" ? t.visible ? "icon-enter" : "icon-leave" : ""}`}>
                    {type === "success" ? (
                        <svg viewBox="0 0 20 20" className="w-5 h-5 pb-0.5 pr-1 text-var-color-00 dark:text-var-color-31 overflow-visible">
                            <path className="checkmark-path" d="M5 12 L10 17 L20 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" strokeDashoffset="24"
                                style={{
                                    animation: "checkmark-draw 0.3s cubic-bezier(0.65, 0, 0.45, 1) forwards",
                                    animationDelay: "0.2s"
                                }}
                            />
                        </svg>
                    ) : type === "error" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4.5 text-var-color-00 dark:text-var-color-28">
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>
                        </svg>
                    ) : type === "warning" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-5 text-var-color-32">
                            <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z" stroke="currentColor" strokeWidth="0.3"/>
                            <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z" stroke="currentColor" strokeWidth="0.2"/>
                        </svg>
                    ) : type === "info" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-6 text-var-color-00 dark:text-var-color-19">
                            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-6 text-var-color-20 dark:text-var-color-33">
                            <path d="M2.5 15a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1zm2-13v1c0 .537.12 1.045.337 1.5h6.326c.216-.455.337-.963.337-1.5V2zm3 6.35c0 .701-.478 1.236-1.011 1.492A3.5 3.5 0 0 0 4.5 13s.866-1.299 3-1.48zm1 0v3.17c2.134.181 3 1.48 3 1.48a3.5 3.5 0 0 0-1.989-3.158C8.978 9.586 8.5 9.052 8.5 8.351z"/>
                        </svg>
                    )}
                </div>
                {/* متن */}
                <div className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-var-color-08 dark:text-var-color-01 ml-4">{message}</div>
                {/* دکمه های کنترلی */}
                {type !== 'loading' &&
                    <div className={`shrink-0 flex items-center gap-2 ${type === "success" ? "text-green-500 dark:text-var-color-31" : type === "error" ? "text-red-500 dark:text-var-color-28" : type === "warning" ? "text-orange-400 dark:text-var-color-32" : type === "info" ? "text-var-color-19 dark:text-var-color-19" : null}`}>
                        <button className="bg-transparent border-none cursor-pointer text-inherit" onClick={handlePauseToggle} aria-label={paused ? "resume" : "pause"}>
                            {paused ? <FaPlay className="text-[11px]" /> : <PiPauseDuotone className="text-[13px]" />}
                        </button>
                        <button className="bg-transparent border-none cursor-pointer text-[18px] text-inherit" onClick={handleClose} aria-label="close">
                            <IoClose />
                        </button>
                    </div>
                }
            </header>
            {/* نوار پیشرفت */}
            {type !== 'loading' &&
                <footer className="w-full h-1 bg-var-color-02 dark:bg-var-color-10 rounded mt-2 overflow-hidden">
                    <div className={`h-full origin-left transition-transform duration-100 linear ${type === "success" ? "bg-green-500 dark:[background:var(--color-var-gradient-03)]" : type === "error" ? "bg-red-500 dark:[background:var(--color-var-gradient-00)]" : type === "warning" ? "bg-orange-400 dark:[background:var(--color-var-gradient-01)]" : type === "info" ? "bg-var-color-19 dark:[background:var(--color-var-gradient-02)]" : null}`}
                        style={{transform: `scaleX(${Math.max(0, Math.min(1, progress))})`,}}/>
                </footer>
            }
        </section>
    );
}
