import {api} from "./client";

// یادآوریِ پیامکیِ بدهی. فهرست و ارسال دو درخواستِ جدا هستند و باید باشند:
// کاربر اول می‌بیند به چه کسانی و چه مبلغی، بعد تصمیم می‌گیرد. پیامک پول دارد
// و به آدمِ واقعی می‌رسد، پس هیچ ارسالی بدونِ دیدنِ فهرست انجام نمی‌شود.
export const remindersApi = {
    debtors: () => api.get("/reminders/debtors/"),
    send: (customerIds) => api.post("/reminders/send/", {customer_ids: customerIds}),
};
