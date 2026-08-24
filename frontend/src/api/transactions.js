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

// همهٔ تراکنش‌های مالک (از همهٔ مشتری‌ها) — صفحه‌بندی‌شده برای اسکرولِ بی‌نهایت.
// {count, next, previous, results: [{…, customer_id, customer_fullname}]}
export const allTransactionsApi = {
    list: ({page = 1, query = "", filter = "all"} = {}) => {
        const params = new URLSearchParams({page: String(page)});
        if (query.trim()) params.set("query", query.trim());
        if (filter && filter !== "all") params.set("filter", filter);
        return api.get(`/transactions/?${params.toString()}`);
    },
    // جستجوی تاریخ شمسی — بدنه POST است ولی شمارهٔ صفحه در query می‌ماند تا همان
    // اسکرولِ بی‌نهایت بتواند تغذیه‌اش کند
    search: ({page = 1, payload}) => api.post(`/transactions/search/?page=${page}`, payload ?? {}),
};
