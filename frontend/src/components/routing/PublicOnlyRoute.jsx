import {Navigate, Outlet} from "react-router";
import {useAuth} from "../../context/AuthContext";

// صفحه‌های ورود/ثبت‌نام برای کاربرِ واردشده معنایی ندارند → به دفترش برگردانده می‌شود
const PublicOnlyRoute = () => {
    const {user, loading} = useAuth();

    if (loading) return null;
    if (user) return <Navigate to="/customers" replace/>;
    return <Outlet/>;
};

export default PublicOnlyRoute;
