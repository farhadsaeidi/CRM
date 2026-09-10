import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// مرورگر فقط با Vite (:5173) کار می‌کند؛ این پراکسی درخواست‌های جنگو را
// به :8000 فوروارد می‌کند تا همه‌چیز Same-Origin دیده شود (کوکی سشن + CSRF بدون CORS).
// نکته: «/admin» عمداً پراکسی نمی‌شود چون روتِ SPA فرانت است؛
// پنل ادمین جنگو روی «/django-admin» است تا رفرش/ورود مستقیمِ /admin به جنگو نرود.
// ⚠️ **دامنه‌های تونل و پراکسی بینِ `server` و `preview` مشترک‌اند.**
// دو نسخهٔ جدا یعنی روزی یکی به‌روز می‌شود و آن یکی جا می‌ماند — و علامتش این
// است که برنامه در dev کار می‌کند و در preview «Blocked request» می‌دهد.
const TUNNEL_HOSTS = [".devtunnels.ms", ".trycloudflare.com", ".ngrok-free.app",
                      ".lhr.life", ".serveo.net", ".serveousercontent.com"];

const API_PROXY = {
  "/api": "http://localhost:8000",
  "/django-admin": "http://localhost:8000",
  "/media": "http://localhost:8000",
  "/static": "http://localhost:8000",
};

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
    // ⚠️ **بدونِ این، لینکِ تونل فقط «Blocked request. This host is not allowed.»
    // نشان می‌دهد.** از نسخهٔ ۶، Vite هر درخواستی را که `Host` ناشناخته داشته
    // باشد رد می‌کند (محافظت در برابر DNS rebinding). آدرسِ تونل یک دامنهٔ
    // بیرونی است، پس باید صریح مجاز شود.
    //
    // نقطهٔ ابتدای هر ورودی یعنی «خودش و همهٔ زیردامنه‌هایش»، پس آدرسِ تصادفیِ
    // هر بار ساختنِ تونل هم بدونِ دست زدن به این فایل کار می‌کند.
    allowedHosts: TUNNEL_HOSTS,
    // ⚠️ **پشتِ تونل، HMR باید بداند روی کدام پورت صدا بزند.**
    //
    // کلاینتِ HMR آدرسِ وب‌سوکت را از `location.hostname` + پورتِ سرور می‌سازد،
    // یعنی `wss://<آدرس-تونل>:5173` — ولی تونل روی ۴۴۳ سرو می‌کند و آن اتصال
    // هرگز برقرار نمی‌شود. نتیجه‌اش اورلیِ «server connection lost» وسطِ صفحه
    // است؛ برنامه کار می‌کند ولی بیننده یک خطای تمام‌صفحه می‌بیند.
    //
    // با متغیرِ محیطی سوییچ می‌شود تا توسعهٔ محلی دست نخورد:
    //     VITE_TUNNEL=1 npm run dev
    hmr: process.env.VITE_TUNNEL ? {clientPort: 443, protocol: "wss"} : true,
    proxy: API_PROXY,
  },
  // ⚠️ **برای اشتراک‌گذاری از راهِ تونل، `preview` را بدهید نه `dev`.**
  //
  // سرورِ dev هر ماژول را جدا سرو می‌کند — برای این برنامه صدها درخواست. روی
  // یک تونلِ رایگان که به ~۱٫۶ کیلوبایت بر ثانیه محدود می‌شود، صفحه هرگز کامل
  // بالا نمی‌آید: تایتل می‌آید و بقیه نه. اندازه‌گیری شد: یک فایلِ ۱۳۰ کیلوبایتی
  // ۸۰ ثانیه طول کشید.
  //
  // `preview` همان بیلدِ production را سرو می‌کند — چند فایلِ فشرده به‌جای صدها
  // ماژول. همان پراکسی را لازم دارد، وگرنه `/api` به جنگو نمی‌رسد.
  //
  //     npm run build && npm run preview -- --port 5173
  preview: {
    host: true,
    allowedHosts: TUNNEL_HOSTS,
    proxy: API_PROXY,
  },
})
