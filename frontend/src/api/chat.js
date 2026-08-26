import {api} from "./client";

// دستیارِ گفتگو. گفتگوها از این به بعد سمتِ سرور می‌مانند، پس رفرشِ صفحه و
// باز کردن از دستگاهِ دیگر تاریخچه را از دست نمی‌دهد.
export const chatApi = {
    list: () => api.get("/chat/conversations/"),
    create: () => api.post("/chat/conversations/", {}),
    detail: (id) => api.get(`/chat/conversations/${id}/`),
    remove: (id) => api.delete(`/chat/conversations/${id}/`),
    // پاسخِ دستیار فعلاً `null` برمی‌گردد — موتور در فاز بعد وصل می‌شود
    send: (id, body) => api.post(`/chat/conversations/${id}/messages/`, {body}),
};
