import {RouterProvider} from "react-router";
import {Toaster} from "react-hot-toast";
import router from "./routes";
import {AuthProvider} from "./context/AuthProvider";

const App = () => {
  return (
    // AuthProvider ---> وضعیت احراز هویت را در سراسر برنامه در دسترس می‌گذارد
    // RouterProvider ---> تابلوی راهنمای مسیرها

    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" containerClassName="!z-[9999]" />
    </AuthProvider>
  );
};

export default App;
