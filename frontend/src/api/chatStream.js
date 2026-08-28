import {BASE_URL} from "./client";

/**
 * خواندنِ پاسخِ دستیار به‌صورت جریان (SSE).
 *
 * ⚠️ عمداً از `api/client.js` نمی‌رود: آنجا کلِ بدنه با `response.text()` خوانده
 * می‌شود و بعد JSON پارس می‌گردد — یعنی تا آخرین بایت صبر می‌کند. دقیقاً همان
 * رفتاری که استریم برای فرارِ از آن ساخته شده.
 *
 * ⚠️ `EventSource` هم به کار نمی‌آید: فقط GET می‌فرستد و هدرِ CSRF نمی‌گیرد،
 * در حالی که اینجا یک POST با بدنه لازم است. پس `fetch` + خواندنِ دستیِ جریان.
 */

const getCookie = (name) => {
    const match = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
    return match ? decodeURIComponent(match.pop()) : null;
};

/**
 * @param id شناسهٔ گفتگو
 * @param body متنِ پیام
 * @param handlers `{onStart, onDelta, onTool, onReset, onDone, onError}`
 * @param signal برای لغو از بیرون
 */
export async function streamMessage(id, body, handlers = {}, signal) {
    const csrftoken = getCookie("csrftoken");
    const response = await fetch(`${BASE_URL}/chat/conversations/${id}/stream/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(csrftoken ? {"X-CSRFToken": csrftoken} : {}),
        },
        credentials: "include",
        body: JSON.stringify({body}),
        signal,
    });

    if (!response.ok || !response.body) {
        // خطای پیش از شروعِ جریان (مثلاً ۴۰۴ یا بدنهٔ خالی) — بدنه JSON است
        let data;
        try {
            data = await response.json();
        } catch {
            data = null;
        }
        const error = new Error("stream failed");
        error.status = response.status;
        error.data = data;
        throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // ⚠️ مرزِ رویدادها «خطِ خالی» است، نه هر تکه‌ای که از شبکه می‌رسد. یک رویداد
    // می‌تواند بین دو تکه نصف شود، پس تا رسیدنِ `\n\n` در بافر می‌ماند.
    for (;;) {
        const {done, value} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});

        let split;
        while ((split = buffer.indexOf("\n\n")) !== -1) {
            const block = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);

            let event = "message";
            let payload = null;
            for (const line of block.split("\n")) {
                if (line.startsWith("event: ")) event = line.slice(7).trim();
                else if (line.startsWith("data: ")) {
                    try {
                        payload = JSON.parse(line.slice(6));
                    } catch {
                        payload = null;
                    }
                }
            }

            if (event === "start") handlers.onStart?.(payload);
            else if (event === "delta") handlers.onDelta?.(payload?.text ?? "");
            else if (event === "tool") handlers.onTool?.(payload?.name ?? "");
            else if (event === "reset") handlers.onReset?.();
            else if (event === "done") handlers.onDone?.(payload?.assistantMessage ?? null);
            else if (event === "error") handlers.onError?.(payload?.error ?? "خطای نامعلوم");
        }
    }
}
