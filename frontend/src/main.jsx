import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OverlayScrollbars } from 'overlayscrollbars'
import './index.css'
import App from './App.jsx'

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
