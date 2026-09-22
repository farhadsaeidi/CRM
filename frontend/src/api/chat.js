import {api} from "./client";

// دستیارِ گفتگو. گفتگوها از این به بعد سمتِ سرور می‌مانند، پس رفرشِ صفحه و
// باز کردن از دستگاهِ دیگر تاریخچه را از دست نمی‌دهد.
export const chatApi = {
    list: () => api.get("/chat/conversations/"),
    create: () => api.post("/chat/conversations/", {}),
    detail: (id) => api.get(`/chat/conversations/${id}/`),
    remove: (id) => api.delete(`/chat/conversations/${id}/`),
    rename: (id, title) => api.patch(`/chat/conversations/${id}/`, {title}),
    rewind: (id, messageId) =>
        api.post(`/chat/conversations/${id}/rewind/`, {message_id: messageId}),
    fork: (id, messageId) =>
        api.post(`/chat/conversations/${id}/fork/`, {message_id: messageId}),
    send: (id, body, model) => api.post(`/chat/conversations/${id}/messages/`, {body, model}),
    // فهرستِ مدل‌ها از سرور می‌آید نه از کدِ فرانت: فهرستِ سفید آنجاست و دو
    // نسخه از یک حقیقت یعنی روزی کشو مدلی را نشان می‌دهد که سرور نمی‌پذیرد.
    models: () => api.get("/chat/models/"),
    // دادهٔ یک `Query` در رابطی که دستیار ساخته — نام و آرگومان را مدل نوشته،
    // پس فهرستِ سفید و اسکوپِ کاربر سمتِ سرور است (`UiQueryView`)
    query: (tool, args) => api.post("/chat/query/", {tool, args}),
    // سنجاق‌های داشبورد. فقط شناسهٔ پیام می‌رود؛ کدِ رابط را سرور از خودِ پیام برمی‌دارد
    pins: () => api.get("/chat/pins/"),
    pin: (messageId) => api.post("/chat/pins/", {message_id: messageId}),
    unpin: (id) => api.delete(`/chat/pins/${id}/`),
};
