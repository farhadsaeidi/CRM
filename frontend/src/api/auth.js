import {api} from "./client";

export const authApi = {
    me: () => api.get("/auth/me/"),
    login: (data) => api.post("/auth/login/", data),
    register: (data) => api.post("/auth/register/", data),
    otpPhone: (data) => api.post("/auth/otp/phone/", data),
    otpConfirm: (data) => api.post("/auth/otp/confirm/", data),
    forgetPassword: (data) => api.post("/auth/forget-password/", data),
    // بدنه می‌تواند JSON باشد یا FormData (وقتی تصویر هم فرستاده می‌شود) —
    // خودِ client هر دو را می‌شناسد و Content-Type را درست ست می‌کند
    updateProfile: (data) => api.patch("/auth/profile/", data),
    changePassword: (data) => api.post("/auth/change-password/", data),
    logout: () => api.post("/auth/logout/"),
};
