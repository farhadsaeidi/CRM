// جوابِ دستیار = متن + (اختیاری) یک بلوکِ کدِ رابط.
//
// ⚠️ همان قاعدهٔ `split_ui` در `chat/engine.py` است و باید با آن یکی بماند: سرور
// گاردِ «عددِ بی‌پشتوانه» را روی همین «متن» اجرا می‌کند، و اینجا همان متن نمایش
// داده می‌شود. اگر مدل حصارِ ``` را جا بیندازد، از خطِ `root =` به بعد کد است.
const FENCE = /```[^\n]*\n?([\s\S]*?)(?:```|$)/;
const ROOT_LINE = /^root\s*=/m;

export const splitAnswer = (text = "") => {
    const fence = FENCE.exec(text);
    if (fence) {
        return {
            before: text.slice(0, fence.index).trim(),
            code: fence[1].trim(),
            after: text.slice(fence.index + fence[0].length).trim(),
        };
    }
    const root = ROOT_LINE.exec(text);
    if (root) return {before: text.slice(0, root.index).trim(), code: text.slice(root.index).trim(), after: ""};
    return {before: text.trim(), code: null, after: ""};
};
