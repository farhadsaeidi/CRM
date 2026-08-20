import {createBrowserRouter} from "react-router";
import RootLayout from "./components/layout/RootLayout.jsx";
import AuthRedirect from "./components/routing/AuthRedirect.jsx";
import ProtectedRoute from "./components/routing/ProtectedRoute.jsx";
import PublicOnlyRoute from "./components/routing/PublicOnlyRoute.jsx";
import RegLog from "./pages/Auth/RegLog/RegLog.jsx";
import Otp from "./pages/Auth/OTP/Otp.jsx";
import ForgetPassword from "./pages/Auth/ForgetPassword/ForgetPassword.jsx";
import Customers from "./pages/Customers/Customers.jsx";
import NotFound from "./pages/NotFound/NotFound.jsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout/>,
        children: [
            // ریشه: بسته به وضعیت ورود، به دفتر مشتریان یا صفحهٔ ورود
            {index: true, element: <AuthRedirect/>},

            // مسیرهای عمومی — کاربرِ واردشده اینجا کاری ندارد
            // chrome: false یعنی این صفحه‌ها پس‌زمینه و چیدمانِ خودشان را دارند
            {
                element: <PublicOnlyRoute/>,
                handle: {chrome: false},
                children: [
                    {path: "auth/login", element: <RegLog/>, handle: {title: "ورود"}},
                    {path: "auth/register", element: <RegLog/>, handle: {title: "ثبت‌ نام"}},
                    {path: "auth/otp/phone", element: <Otp/>, handle: {title: "ورود با پیامک"}},
                    {path: "auth/otp/confirm", element: <Otp/>, handle: {title: "کد تایید"}},
                    {path: "auth/forget-password", element: <ForgetPassword/>, handle: {title: "فراموشی رمز عبور"}},
                ],
            },

            // مسیرهای حفاظت‌شده
            {
                element: <ProtectedRoute/>,
                children: [
                    {path: "customers", element: <Customers/>, handle: {title: "مشتریان"}},
                ],
            },

            // آدرس‌های ناشناخته → صفحه ۴۰۴
            {path: "*", element: <NotFound/>, handle: {title: "404"}},
        ],
    },
]);

export default router;
