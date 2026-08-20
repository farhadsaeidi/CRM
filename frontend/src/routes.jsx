import {createBrowserRouter} from "react-router";
import RootLayout from "./components/layout/RootLayout.jsx";
import Home from "./pages/Home/Home.jsx";
import NotFound from "./pages/NotFound/NotFound.jsx";

const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout/>,
        children: [
            // ریشه
            // index: true ---> وقتی یوآرال دقیقاً "/" هست، کامپوننت مربوطش رندر می‌شه
            {index: true, element: <Home/>, handle: {title: "خانه"}},
            // آدرس های ناشناخته → صفحه ۴۰۴
            {path: "*", element: <NotFound/>, handle: {title: "404"}},
        ],
    },
]);

export default router;
