// باید اولین ایمپورت بماند — دلیلش داخلِ خودِ فایل
import './lib/scrollTimelineGuard.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OverlayScrollbars } from 'overlayscrollbars'
import './index.css'
import App from './App.jsx'

// حالا که کتابخانه مقدارِ ScrollTimeline را خوانده، برای بقیهٔ صفحه برمی‌گردانیمش.
if (window.__ScrollTimeline) {
    window.ScrollTimeline = window.__ScrollTimeline;
    delete window.__ScrollTimeline;
}

// اسکرولِ خودِ صفحه هم همان اسکرول‌بارِ سفارشیِ بقیهٔ برنامه را می‌گیرد.
// روی body سوار می‌شود نه html، چون OverlayScrollbars برای اسکرولِ سند همین را
// می‌خواهد. `nativeScrollbarsOverlaid` لغوش می‌کند: در دستگاه‌هایی که اسکرول‌بارِ
// بومی خودش شناور است (موبایل و مک) جای خالی نمی‌گیرد و نیازی به جایگزینی نیست.
OverlayScrollbars(
    {target: document.body, cancel: {nativeScrollbarsOverlaid: true}},
    {scrollbars: {theme: 'os-theme-app', autoHide: 'move', autoHideDelay: 500, clickScroll: true}},
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
