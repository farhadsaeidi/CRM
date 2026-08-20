import {api} from "./client";

export const authApi = {
    me: () => api.get("/auth/me/"),
    login: (data) => api.post("/auth/login/", data),
    register: (data) => api.post("/auth/register/", data),
    otpPhone: (data) => api.post("/auth/otp/phone/", data),
    otpConfirm: (data) => api.post("/auth/otp/confirm/", data),
    forgetPassword: (data) => api.post("/auth/forget-password/", data),
    changePassword: (data) => api.post("/auth/change-password/", data),
    logout: () => api.post("/auth/logout/"),
};
