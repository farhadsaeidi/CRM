"""مدل‌هایی که کاربر می‌تواند از کشوی صفحهٔ گفتگو انتخاب کند.

⚠️ **مهم‌ترین قاعدهٔ این فایل: فهرست سفید است، نه یک رشتهٔ آزاد از کلاینت.**

اگر نامِ مدل مستقیم از بدنهٔ درخواست به ارائه‌دهنده می‌رفت، هر کسی که به این
صفحه دسترسی دارد می‌توانست گران‌ترین مدلِ فهرستِ OpenRouter را صدا بزند — و
صورتحسابش پای صاحبِ کلید نوشته می‌شد. اینجا کلاینت فقط یک شناسه از همین فهرست
می‌فرستد و هرچه بیرونِ فهرست باشد بی‌صدا به پیش‌فرض برمی‌گردد.

⚠️ **قاعدهٔ دوم: هر مدل باید tool calling داشته باشد.** کلِ درستیِ این دستیار بر
صدا زدنِ ابزار سوار است؛ مدلی که ابزار صدا نمی‌زند اینجا نه «ضعیف» بلکه **بی‌فایده**
است، چون هر عددش ساختگی می‌شود. پشتیبانیِ همهٔ ردیف‌های زیر روی فهرستِ زندهٔ
OpenRouter بررسی شد (`supported_parameters` شاملِ `tools`).

📌 قیمت‌ها ($ به ازای یک میلیون توکن) در تاریخِ بررسی ثبت شده‌اند تا مقایسه ممکن
باشد؛ مرجعِ به‌روز خودِ openrouter.ai است.
"""
from django.conf import settings

# ⚠️ مدلِ **استدلالی** (reasoning) حینِ فکر کردن هیچ متنی بیرون نمی‌دهد و پارسرِ
# استریمِ ما هم فقط `delta.content` را می‌خواند، پس صفحه چند ثانیه ساکت می‌ماند.
# این نقص نیست ولی کاربر باید بداند، پس در همان کشو برچسب می‌خورد.
MODELS = [
    # پیشنهادِ پیش‌فرض: بدونِ لایهٔ استدلال، پس جواب بی‌مکث شروع می‌شود
    {"id": "openai/gpt-4o-mini", "label": "GPT-4o mini", "reasoning": False},
    {"id": "openai/gpt-4.1-nano", "label": "GPT-4.1 nano", "reasoning": False},
    {"id": "qwen/qwen3.7-flash", "label": "Qwen3.7 Flash", "reasoning": True},
    {"id": "z-ai/glm-5.3-flash", "label": "GLM-5.3 Flash", "reasoning": True},
    {"id": "deepseek/deepseek-v4-flash", "label": "DeepSeek V4 Flash", "reasoning": True},
    {"id": "xiaomi/mimo-v2.5", "label": "MiMo v2.5", "reasoning": True},
    {"id": "z-ai/glm-5.2:free", "label": "GLM-5.2", "reasoning": True, "free": True},
    {"id": "minimax/minimax-m3:free", "label": "MiniMax M3", "reasoning": True, "free": True},
    {"id": "google/gemma-4-31b-it:free", "label": "Gemma 4 31B", "reasoning": True, "free": True},
]

_BY_ID = {model["id"]: model for model in MODELS}


def default_model():
    """مدلی که وقتی کاربر چیزی انتخاب نکرده به کار می‌رود.

    `LLM_MODEL` در `.env` حرفِ آخر را می‌زند. این‌طور یک نصبِ محلی با اولاما هم
    کار می‌کند: مقدارش (`qwen2.5:7b`) در فهرستِ بالا نیست ولی همچنان پیش‌فرض است.
    """
    return settings.LLM_MODEL or (MODELS[0]["id"] if MODELS else "")


def resolve(requested):
    """شناسهٔ معتبر برای این درخواست.

    ⚠️ ورودیِ نامعتبر **خطا نمی‌دهد، به پیش‌فرض برمی‌گردد.** کاربر سوالش را
    پرسیده و مقصر هم نیست اگر کلاینت شناسهٔ کهنه‌ای فرستاده؛ رد کردنِ کلِ پیام
    به‌خاطرِ یک کشوی قدیمی، تنبیهِ اوست نه اصلاحِ خطا.
    """
    requested = str(requested or "").strip()
    if requested and (requested in _BY_ID or requested == default_model()):
        return requested
    return default_model()


def choices():
    """فهرستی که کشوی فرانت نشان می‌دهد.

    اگر `LLM_MODEL` در فهرست نباشد (مثلاً مدلِ محلیِ اولاما) خودش هم به‌عنوان
    ردیفِ اول اضافه می‌شود — وگرنه کاربر مدلی را می‌بیند که انتخاب نکرده و
    مدلی که واقعاً جواب می‌دهد اصلاً در کشو نیست.
    """
    current = default_model()
    rows = list(MODELS)
    if current and current not in _BY_ID:
        rows.insert(0, {"id": current, "label": current, "reasoning": False, "local": True})
    return rows
