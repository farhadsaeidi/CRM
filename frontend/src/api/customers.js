import {api} from "./client";

// ساختِ رشتهٔ کوئری فقط از مقادیرِ پرشده — تا یوآرال با پارامترهای خالی شلوغ نشود
const toQuery = (params = {}) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "" && value !== "all") {
            search.set(key, value);
        }
    }
    const qs = search.toString();
    return qs ? `?${qs}` : "";
};

export const customersApi = {
    // {count, next, previous, results: [{id, fullname, phone, status, code, created}]}
    list: (params) => api.get(`/customers/${toQuery(params)}`),
    create: (data) => api.post("/customers/", data),
    update: (id, data) => api.patch(`/customers/${id}/`, data),
    remove: (id) => api.delete(`/customers/${id}/`),
};
