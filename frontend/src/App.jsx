import { RouterProvider } from "react-router";
import { Toaster } from "react-hot-toast";
import router from "./routes";

const App = () => {
  return (
    // RouterProvider ---> تابلوی راهنمای طبقات
    // Toaster ---> ظرفِ نمایش پیغام‌ها (react-hot-toast)
    // نکته: AuthProvider هنوز نیست؛ با اضافه شدن لایهٔ احراز هویت، همین‌جا
    // دورِ RouterProvider پیچیده می‌شود — دقیقاً مثل SAM.
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" containerClassName="!z-[9999]" />
    </>
  );
};

export default App;
