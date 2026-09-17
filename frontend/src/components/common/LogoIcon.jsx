// لوگوی CRM — همان نشانِ favicon: دفترِ حساب با سه سطرِ رکورد، و سکه‌ای که
// نمادِ تراکنشِ مالی است. در هر دو تم یکسان دیده می‌شود، ولی از رنگِ اصلیِ
// برنامه پیروی می‌کند: مقادیر از `--accent-logo-*` می‌آیند که در `index.css`
// برای هر پالت تعریف شده‌اند.
//
// ⚠️ رنگ با `style` داده می‌شود نه با صفتِ `fill`/`stopColor`: متغیرِ CSS در
// استایلِ درون‌خطی قطعاً کار می‌کند، ولی پشتیبانیِ `var()` داخلِ صفتِ نمایشیِ SVG
// یکدست نیست و ارزشِ ریسک ندارد.
const LogoIcon = ({className = ""}) => (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
            <linearGradient id="crmLogoGrad" x1="4" y1="3" x2="28" y2="29" gradientUnits="userSpaceOnUse">
                <stop style={{stopColor: "var(--accent-logo-from)"}}/>
                <stop offset="1" style={{stopColor: "var(--accent-logo-to)"}}/>
            </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#crmLogoGrad)"/>
        <rect x="2.5" y="2.5" width="27" height="27" rx="7.5" fill="none" stroke="#ffffff" strokeOpacity="0.16"/>
        {/* دفترِ حساب */}
        <rect x="6.5" y="7" width="14" height="18" rx="3" fill="#ffffff"/>
        <g style={{fill: "var(--accent-logo-ink)"}}>
            <rect x="9" y="11" width="9.5" height="1.6" rx="0.8"/>
            <rect x="9" y="15.2" width="7" height="1.6" rx="0.8"/>
            <rect x="9" y="19.4" width="5" height="1.6" rx="0.8"/>
        </g>
        {/* سکه */}
        <circle cx="21.5" cy="20.5" r="5.5" style={{fill: "var(--accent-logo-coin)"}}/>
        <circle cx="21.5" cy="20.5" r="5.5" fill="none" strokeOpacity="0.35"
                style={{stroke: "var(--accent-logo-ink)"}}/>
        <path d="M21.5 17.4v6.2M19.6 19h3.3a1.35 1.35 0 0 1 0 2.7h-2.8a1.35 1.35 0 0 0 0 2.7h3.3"
              fill="none" strokeWidth="1.3" strokeLinecap="round"
              style={{stroke: "var(--accent-logo-ink)"}}/>
    </svg>
);

export default LogoIcon;
