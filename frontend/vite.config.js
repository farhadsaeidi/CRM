import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// مرورگر فقط با Vite (:5173) کار می‌کند؛ این پراکسی درخواست‌های جنگو را
// به :8000 فوروارد می‌کند تا همه‌چیز Same-Origin دیده شود (کوکی سشن + CSRF بدون CORS).
// نکته: «/admin» عمداً پراکسی نمی‌شود چون روتِ SPA فرانت است؛
// پنل ادمین جنگو روی «/django-admin» است تا رفرش/ورود مستقیمِ /admin به جنگو نرود.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // بایند روی همهٔ اینترفیس‌ها، نه فقط لوپ‌بکِ داخلِ WSL.
    // لازم است چون رلهٔ localhostِ ویندوز↔WSL روی این ماشین کار نمی‌کند
    // (شبکه در حالت NAT است و یک پراکسیِ localhost روی ویندوز فعال)، پس بدون این،
    // مرورگرِ ویندوز به :5173 نمی‌رسد و باید با IPِ خودِ WSL صدا زده شود.
    host: true,
    proxy: {
      '/api': 'http://localhost:8000',
      '/django-admin': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
    },
  },
})
