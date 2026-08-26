// مسیرهایی که بیش از یک جا لازم می‌شوند. یک‌جا تعریف می‌شوند تا اگر روزی شکلِ
// یوآرال عوض شد، جای عوض کردنش یکی باشد — نه یک رشتهٔ تکراری در چند فایل.

export const HOME_PATH = "/home";
export const CUSTOMERS_PATH = "/customers";
export const CHAT_PATH = "/chat";
export const PROFILE_PATH = "/profile";

// جدولِ همهٔ تراکنش‌های مالک، بدونِ قیدِ مشتری
export const ALL_TRANSACTIONS_PATH = "/all-transactions";

// دفترِ تراکنش‌های یک مشتری. الگو برای `useMatch` است و سازنده برای `navigate`.
export const CUSTOMER_LEDGER_PATTERN = "/customers/:customerId/transactions";
export const customerLedgerPath = (customerId) => `/customers/${customerId}/transactions`;
