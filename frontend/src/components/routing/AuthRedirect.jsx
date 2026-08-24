import {Navigate} from "react-router";
import {useAuth} from "../../context/AuthContext";

// ریشهٔ سایت: کاربرِ واردشده به داشبورد، مهمان به صفحهٔ ورود
const AuthRedirect = () => {
    const {user, loading} = useAuth();

    // تا وقتی وضعیت ورود از سرور نیامده هیچ‌کجا نفرست — وگرنه کاربرِ واردشده
    // یک لحظه صفحهٔ ورود را می‌بیند
    if (loading) return null;
    return <Navigate to={user ? "/home" : "/auth/login"} replace/>;
};

export default AuthRedirect;
