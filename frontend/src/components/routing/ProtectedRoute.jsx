import {Navigate, Outlet} from "react-router";
import {useEffect, useRef} from "react";
import {useAuth} from "../../context/AuthContext";
import {notify} from "../../lib/notify";

// روت‌هایی که نیاز به ورود دارند
const ProtectedRoute = () => {
    const {user, loading} = useAuth();
    // آیا کاربر در این بازدید زمانی وارد بوده؟ برای اینکه هنگام خروج، پیغامِ
    // «لطفا ابتدا وارد شوید» نیاید — او که خودش خارج شده، هشدار بی‌معناست.
    const wasAuthed = useRef(false);

    useEffect(() => {
        if (user) wasAuthed.current = true;
    }, [user]);

    // فقط وقتی «مهمان» مستقیم یک آدرس حفاظت‌شده را باز می‌کند هشدار بده
    useEffect(() => {
        if (!loading && !user && !wasAuthed.current) {
            notify("لطفا ابتدا وارد شوید...", "warning");
        }
    }, [loading, user]);

    if (loading) return null;
    if (!user) return <Navigate to="/auth/login" replace/>;
    return <Outlet/>;
};

export default ProtectedRoute;
