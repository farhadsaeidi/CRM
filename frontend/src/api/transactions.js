import {api} from "./client";

// فهرست تراکنش‌ها عمداً صفحه‌بندی ندارد (مانده روی کلِ حساب گفته می‌شود)، پس
// تنها پارامترِ کوئری فیلترِ دوره است.
const periodQuery = (filter) => (filter && filter !== "all" ? `?filter=${encodeURIComponent(filter)}` : "");

export const transactionsApi = {
    // {customer: {...}, transactions: [{id, debt, paid, created, year, month, day}], remainder}
    list: (customerId, filter) => api.get(`/customers/${customerId}/transactions/${periodQuery(filter)}`),
    // جستجوی تاریخ شمسی POST است نه GET — ساختارِ تودرتوی سال/ماه/روز در
    // query string خوانا نمی‌شود
    search: (customerId, body) => api.post(`/customers/${customerId}/transactions/search/`, body),
    create: (customerId, data) => api.post(`/customers/${customerId}/transactions/`, data),
    update: (customerId, id, data) => api.patch(`/customers/${customerId}/transactions/${id}/`, data),
    remove: (customerId, id) => api.delete(`/customers/${customerId}/transactions/${id}/`),
};
