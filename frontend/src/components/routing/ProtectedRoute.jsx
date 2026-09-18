import {Navigate, Outlet} from "react-router";
import {useEffect} from "react";
import {useAuth} from "../../context/AuthContext";
import {notify} from "../../lib/notify";

// آیا کاربر در این بازدید زمانی وارد بوده؟ برای اینکه هنگامِ خروج، پیغامِ
// «لطفا ابتدا وارد شوید» نیاید — او که خودش خارج شده، هشدار بی‌معناست.
//
// ⚠️ **بیرونِ کامپوننت است، نه `useRef`.** ref عمرش به همان نمونه بسته است، و
// هنگامِ خروج این گارد از نو ساخته می‌شود: `RootLayout` با خالی شدنِ `user` از
// شاخهٔ هدر‌وفوتردار به شاخهٔ ساده می‌پرد و `<Outlet/>` جای دیگری از درخت
// می‌نشیند، پس React این زیرشاخه را unmount و دوباره mount می‌کند. نمونهٔ تازه
// ref را false می‌دید و هشدار را درست بعد از خروج نشان می‌داد.
//
// «این بازدید» یعنی همین بارگذاریِ صفحه — دقیقاً عمرِ متغیرِ ماژول. رفرش یا باز
// کردنِ مستقیمِ یک آدرس صفرش می‌کند، پس مهمانی که آدرسِ حفاظت‌شده را تایپ کند
// هشدار را همچنان می‌بیند.
let hadSession = false;

// روت‌هایی که نیاز به ورود دارند
const ProtectedRoute = () => {
    const {user, loading} = useAuth();

    useEffect(() => {
        if (user) hadSession = true;
    }, [user]);

    // فقط وقتی «مهمان» مستقیم یک آدرس حفاظت‌شده را باز می‌کند هشدار بده
    useEffect(() => {
        if (!loading && !user && !hadSession) {
            notify("لطفا ابتدا وارد شوید...", "warning");
        }
    }, [loading, user]);

    if (loading) return null;
    if (!user) return <Navigate to="/auth/login" replace/>;
    return <Outlet/>;
};

export default ProtectedRoute;
