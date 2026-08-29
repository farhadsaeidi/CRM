"""موتورِ پاسخ‌گویی دستیار.

حلقهٔ کار ساده است و همان چیزی که مدل‌های زبانی برایش ساخته شده‌اند:

    ۱. پیامِ کاربر + فهرستِ ابزارها به مدل می‌رود
    ۲. مدل یا جواب می‌دهد، یا می‌گوید «فلان ابزار را با این پارامترها صدا بزن»
    ۳. کدِ ما ابزار را اجرا می‌کند و نتیجهٔ عددی را برمی‌گرداند پیشِ مدل
    ۴. برگرد به ۲، تا وقتی مدل جمله بسازد

⚠️ **هیچ کتابخانهٔ عاملی (LangChain و مانندش) اینجا نیست و لازم هم نیست.** آنچه
لازم است یک درخواستِ HTTP و همین حلقه است؛ یک لفافهٔ بزرگ فقط انتزاعِ خودش را
اضافه می‌کرد بدونِ اینکه کاری بکند که این ۱۵۰ خط نمی‌کند.

⚠️ **RAG هم اینجا جایی ندارد.** دادهٔ این پروژه ساختاریافته است و «رضا چقدر
بدهکار است؟» یک جوابِ دقیق از `SUM()` دارد. جستجوی برداریِ متن، عددِ قطعی را به
تقریب تبدیل می‌کند — در دفترِ حساب، بدترین معاملهٔ ممکن.
"""
import json
import logging
import re

import requests
from django.conf import settings

from .tools import TOOLS, has_data, run_tool, tool_schemas

logger = logging.getLogger(__name__)

# سقفِ رفت‌وبرگشت با مدل. بدونِ آن، مدلی که در حلقهٔ صدا زدنِ ابزار گیر کند
# می‌تواند تا ابد ادامه دهد.
MAX_STEPS = 5

# ⚠️ دو تایم‌اوتِ جدا: (وصل شدن، خواندن).
#
# خواندن باید بلند باشد چون مدلِ محلی روی CPU کند است و اولین درخواست وزن‌ها را
# هم در حافظه بار می‌کند. ولی **وصل شدن** باید کوتاه باشد: اگر سرویس بالا نباشد
# TCP فوراً می‌فهمد، و با یک عددِ مشترک کاربر پنج دقیقه منتظرِ خطایی می‌ماند که
# در ده ثانیه معلوم بود. یک بار همین اتفاق افتاد و تشخیصش را کند کرد.
TIMEOUT_SECONDS = (10, 300)

# ⚠️ **اجبارِ ابزار، در حلقهٔ خودمان.**
#
# مدل گاهی بدونِ صدا زدنِ هیچ ابزاری جواب می‌دهد و عددها را از خودش می‌سازد —
# در دفترِ حساب بدترین خروجیِ ممکن. `tool_choice: "required"` راهِ استانداردش
# است ولی **اولاما آن را نادیده می‌گیرد** (آزموده شد: متن برگرداند نه فراخوانی).
#
# پس خودمان اجبار می‌کنیم: اگر جوابِ نهایی عدد داشت ولی هیچ ابزاری اجرا نشده
# بود، یک تذکر به گفتگو اضافه می‌شود و مدل دوباره تلاش می‌کند. یک بار — نه
# بیشتر، چون هر تلاش روی CPU چند دقیقه است.
GROUNDING_RETRIES = 1

# ⚠️ **وقتی تذکر هم جواب نداد، جوابِ مدل نشان داده نمی‌شود.**
#
# پیش‌تر بعد از تذکرِ ناموفق همان متنِ بی‌پشتوانه روی صفحه می‌نشست و فقط یک خطِ
# هشدارِ کوچک زیرش می‌آمد. برای دفترِ حساب کافی نیست: کاربر عدد را می‌خواند و
# هشدار را نه. «نمی‌دانم» در بدترین حالت ناقص است؛ عددِ ساختگی غلط است.
GROUNDING_REFUSAL = (
    "این را نتوانستم از دفترِ شما بخوانم، و بدونِ دادهٔ دفتر عددی نمی‌گویم. "
    "لطفاً سوال را کمی روشن‌تر بپرسید یا نامِ مشتری را بنویسید."
)

GROUNDING_NUDGE = (
    "تو بدونِ صدا زدنِ هیچ ابزاری عدد نوشتی. آن عددها ساختگی‌اند و اجازه نداری "
    "چنین جوابی بدهی. همین حالا ابزارِ مناسب را صدا بزن و از روی خروجیِ آن جواب بده."
)

# متنی که خروجیِ داخلیِ مدل است و نه جوابِ کاربر: یک بار دوباره می‌پرسیم.
# بیشتر از یک بار نه — هر تلاش روی CPU چند دقیقه است و مدلی که دو بار قالب را
# اشتباه بنویسد، بارِ سوم هم می‌نویسد.
FORMAT_RETRIES = 1

FORMAT_NUDGE = (
    "آنچه نوشتی فراخوانیِ ابزار بود نه جوابِ کاربر، و قالبش هم درست نبود. "
    "اگر به ابزاری نیاز داری، آن را از راهِ رسمیِ tool calling صدا بزن و هیچ‌وقت "
    "نامِ ابزار یا JSON را داخلِ متن ننویس. اگر نیازی نیست، فقط به فارسیِ ساده جواب بده."
)

# ارقامِ لاتین، فارسی و عربی — عددی که ابزاری پشتش نیست، ساختهٔ مدل است
_DIGITS = re.compile(r"[0-9۰-۹٠-٩]")


def _has_numbers(text):
    return bool(_DIGITS.search(text or ""))

SYSTEM_PROMPT = """تو دستیارِ سامانهٔ «مدیریت مشتریان» هستی؛ یک دفترِ حسابِ نسیه و پرداختی.

کاربرِ تو صاحبِ کسب‌وکار است و دربارهٔ مشتریان و حساب‌هایش می‌پرسد.

قواعدِ کارت:
- همیشه فارسی و کوتاه جواب بده، مثلِ یک حسابدارِ کاربلد نه یک ربات.
- هیچ **عدد، نامِ مشتری، یا تاریخی** از خودت نساز. هر کدام باید عیناً در خروجیِ
  ابزاری که در **همین گفتگو** تازه صدا زده‌ای آمده باشد. نامِ آدم‌ها را کپی کن،
  از حافظه ننویس.
- **تاریخ را تبدیل نکن.** خروجیِ ابزار هم شکلِ عددی دارد هم شکلِ حروفی؛ یکی از
  همان دو را عیناً بنویس. هرگز خودت شمارهٔ ماه را به نامِ ماه برنگردان.
- اگر ابزار «پیدا نشد» یا خطا برگرداند، آن یعنی **داده‌ای نداری** — نه اینکه
  اجازه داری خودت جواب بسازی. در آن حالت بگو پیدا نکردی.
- برای **هر** سوالِ تازه که به عدد نیاز دارد، دوباره ابزار را صدا بزن — حتی اگر
  چند لحظه پیش سوالِ شبیهی پرسیده شده. اعداد ممکن است عوض شده باشند و جوابِ
  حفظی همیشه غلط است.
- اگر ابزاری صدا نزده‌ای، حق نداری هیچ رقمی بنویسی. به‌جایش بگو باید نگاه کنی.
- اگر برای جواب دادن به داده نیاز داری، اول ابزارِ مناسب را صدا بزن.
- اگر ابزار خطا برگرداند یا داده‌ای نبود، صادقانه بگو نمی‌دانی. حدس نزن.
- مبلغ‌ها به تومان‌اند. آن‌ها را با جداکنندهٔ سه‌رقمی بنویس.
- کدام ابزار برای کدام سوال:
  • «آخرین/تازه‌ترین تراکنش»، «اخیراً چه شده» → recent_transactions
  • «تراکنش‌های فلانی»، «فلانی کِی خرید کرد» → اول find_customer، بعد customer_transactions
  • «حسابِ فلانی»، «فلانی چقدر بدهکار است» → اول find_customer، بعد customer_ledger
  • «چه کسانی بدهکارند» → debtors
  • «خوش‌حساب‌ترین» → best_payers
  • «چه کسی را پیگیری کنم»، «کی مدت‌هاست نیامده» → dormant_customers
  • «وضعیت کلی»، «این ماه چطور بود» → overview
- نامِ مشتری را هرگز مستقیم به customer_ledger یا customer_transactions نده؛
  آن‌ها فقط شناسهٔ عددی می‌گیرند و شناسه از find_customer می‌آید.
- «مانده منفی» یعنی مشتری بدهکار است و تو طلبکاری. «مانده مثبت» یعنی برعکس.

تو فقط می‌خوانی و توضیح می‌دهی. هیچ‌وقت چیزی ثبت، ویرایش یا حذف نمی‌کنی و پیامکی
نمی‌فرستی — اگر کاربر چنین چیزی خواست، بگو باید خودش از دکمهٔ مربوطه اقدام کند."""


class EngineNotConfigured(Exception):
    """سه مقدارِ `.env` ست نشده‌اند."""


class EngineError(Exception):
    """ارتباط با مدل شکست خورد."""


def is_configured():
    return bool(settings.LLM_BASE_URL and settings.LLM_MODEL)


def _call_model(messages):
    """یک رفت‌وبرگشت با مدل، روی قراردادِ سازگار با OpenAI."""
    url = f"{settings.LLM_BASE_URL.rstrip('/')}/chat/completions"
    try:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.LLM_MODEL,
                "messages": messages,
                "tools": tool_schemas(),
                # دمای پایین: اینجا جای خلاقیت نیست، جای گزارشِ درست است
                "temperature": 0.2,
            },
            timeout=TIMEOUT_SECONDS,
            # ⚠️ مدل روی 127.0.0.1 است و نباید از پراکسیِ سیستم رد شود
            proxies={"http": None, "https": None},
        )
    except requests.RequestException as error:
        raise EngineError(f"ارتباط با مدل برقرار نشد: {error}") from error

    if response.status_code != 200:
        raise EngineError(f"مدل خطا داد ({response.status_code}): {response.text[:200]}")

    try:
        return response.json()["choices"][0]["message"]
    except (ValueError, KeyError, IndexError) as error:
        raise EngineError(f"پاسخِ مدل قابلِ خواندن نبود: {error}") from error


def _merge_tool_deltas(buffer, deltas):
    """تکه‌های `tool_calls` که در استریم قطعه‌قطعه می‌آیند را کنارِ هم می‌چیند.

    ⚠️ در استریم، نامِ ابزار و آرگومان‌هایش در چند تکه می‌رسند و `index` تنها
    چیزی است که می‌گوید هر تکه به کدام فراخوانی تعلق دارد — `id` معمولاً فقط
    در تکهٔ اول می‌آید. جمع کردنشان با ترتیبِ ورود اشتباه است، چون مدل می‌تواند
    چند ابزار را هم‌زمان بسازد.
    """
    for delta in deltas:
        index = delta.get("index", 0)
        # ⚠️ شناسه اگر نیاید باید ساخته شود، نه اینکه خالی بماند. اولاما در
        # استریم `id` نمی‌فرستد و پیامی که با `"id": ""` برگردد را با ۴۰۰ رد
        # می‌کند — در ۰٫۷ میلی‌ثانیه، یعنی پیش از اینکه مدل اصلاً نگاهش کند.
        slot = buffer.setdefault(index, {"id": f"call_{index}", "type": "function",
                                         "function": {"name": "", "arguments": ""}})
        if delta.get("id"):
            slot["id"] = delta["id"]
        function = delta.get("function") or {}
        if function.get("name"):
            slot["function"]["name"] = function["name"]
        # آرگومان‌ها رشته‌اند و باید **به هم چسبانده** شوند، نه جایگزین
        if function.get("arguments"):
            slot["function"]["arguments"] += function["arguments"]


def _stream_model(messages):
    """یک رفت‌وبرگشت با مدل، به‌صورت استریم.

    ژنراتوری که تکه‌های متن را حین رسیدن بیرون می‌دهد و در پایان پیامِ کاملِ
    سرِ هم شده را با `StopIteration.value` برمی‌گرداند.

    ⚠️ **همهٔ قدم‌ها استریم می‌شوند، نه فقط آخری.** از قبل نمی‌دانیم کدام قدم
    جوابِ نهایی است؛ اگر ابزارها را بی‌استریم اجرا کنیم و بعد برای متن دوباره
    بپرسیم، روی CPU چند دقیقه به هر پاسخ اضافه می‌شود. قدم‌هایی که به ابزار
    ختم می‌شوند متنی ندارند، پس چیزی هم بیرون نمی‌دهند.
    """
    url = f"{settings.LLM_BASE_URL.rstrip('/')}/chat/completions"
    try:
        response = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.LLM_MODEL,
                "messages": messages,
                "tools": tool_schemas(),
                "temperature": 0.2,
                "stream": True,
            },
            timeout=TIMEOUT_SECONDS,
            stream=True,
            proxies={"http": None, "https": None},
        )
    except requests.RequestException as error:
        raise EngineError(f"ارتباط با مدل برقرار نشد: {error}") from error

    if response.status_code != 200:
        raise EngineError(f"مدل خطا داد ({response.status_code}): {response.text[:200]}")

    # ⚠️ **بدونِ این خط، کلِ پاسخِ فارسی به‌هم‌ریخته می‌رسد.**
    #
    # اولاما هدرِ `text/event-stream` را **بدونِ charset** می‌فرستد، و `requests`
    # طبق استانداردِ HTTP برای `text/*`ِ بی‌charset به ISO-8859-1 برمی‌گردد. پس
    # `decode_unicode=True` بایت‌های UTF-8 را لاتین-۱ می‌خواند و «بدهکار» به
    # «Ø¨Ø¯ÙÚ©Ø§Ø±» تبدیل می‌شود. مسیرِ غیراستریم این مشکل را ندارد چون
    # `response.json()` همیشه UTF-8 فرض می‌کند.
    response.encoding = "utf-8"

    content = []
    tool_buffer = {}
    try:
        for line in response.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data:"):
                continue
            payload = line[5:].strip()
            if payload == "[DONE]":
                break
            try:
                chunk = json.loads(payload)
            except ValueError:
                continue

            choices = chunk.get("choices") or []
            if not choices:
                continue
            delta = choices[0].get("delta") or {}

            piece = delta.get("content")
            if piece:
                content.append(piece)
                yield piece

            if delta.get("tool_calls"):
                _merge_tool_deltas(tool_buffer, delta["tool_calls"])
    finally:
        response.close()

    message = {"role": "assistant", "content": "".join(content)}
    if tool_buffer:
        message["tool_calls"] = [tool_buffer[i] for i in sorted(tool_buffer)]
    return message


def _rescue_tool_calls(message):
    """درخواستِ ابزاری که به‌جای فیلدِ ساختاریافته در متن آمده.

    ⚠️ این وصله نیست، لازم است. با `qwen2.5:7b` روی اولاما دیده شد که پاسخ
    به‌جای `tool_calls` این می‌آمد:

        orm
        {"name": "debtors", "arguments": {"limit": 10}}
        </tool_call>

    یعنی مدل ابزارِ **درست** را انتخاب کرده بود و فقط پارسرِ سرور آن را از متن
    بیرون نکشیده بود. بدونِ این تابع، همان جوابِ درست به‌عنوان متنِ بی‌معنا به
    کاربر نشان داده می‌شد.

    چون قرار است ارائه‌دهنده با سه خط در `.env` عوض شود، این استحکام ارزش دارد:
    هر مدلی این کار را کمی متفاوت انجام می‌دهد.

    ⚠️ **با regex پیدا نمی‌شود.** الگوی غیرحریصِ آکولاد روی آکولادِ تودرتو
    (`"arguments": {...}`) سرِ اولین بستن می‌ایستد و JSONِ ناقص می‌دهد. پس از
    `raw_decode` استفاده می‌شود که خودش می‌داند شیء کجا تمام می‌شود.
    """
    content = (message.get("content") or "").strip()
    if not content or "{" not in content:
        return None

    decoder = json.JSONDecoder()
    position = 0
    while True:
        position = content.find("{", position)
        if position == -1:
            return None
        try:
            payload, _ = decoder.raw_decode(content, position)
        except ValueError:
            position += 1
            continue

        position += 1
        if not isinstance(payload, dict):
            continue
        name = payload.get("name")
        if not isinstance(name, str) or not name:
            continue

        arguments = payload.get("arguments", payload.get("parameters", {}))
        return [_rescued(name, arguments)]

    return None


# نشانه‌های «این متن برای من نوشته نشده، برای پارسر نوشته شده».
# هر کدام از این‌ها در عمل روی صفحهٔ کاربر دیده شده‌اند.
_MACHINE_MARKERS = ("<tool_call>", "</tool_call>", '"arguments"', '"parameters"',
                    "<|tool", "functools[")


def _looks_machine(text):
    """آیا این متن، خروجیِ داخلیِ مدل است نه جوابِ کاربر؟

    ⚠️ **این گارد از همهٔ نجات‌دهنده‌ها مهم‌تر است.** هر نجات‌دهنده یک *شکلِ
    مشخص* را می‌شناسد، و مدلِ ۷ میلیاردی هر بار شکلِ تازه‌ای می‌سازد؛ یعنی
    فهرستشان هیچ‌وقت کامل نمی‌شود. این تابع برعکس کار می‌کند: لازم نیست شکل را
    بشناسد، فقط می‌فهمد که جواب نیست — و جلوی نشستنش روی صفحه را می‌گیرد.

    معیارها سخت‌گیرند تا جوابِ سالمِ فارسی قربانی نشود: یا نشانهٔ صریحِ
    ابزار دارد، یا کلِ متن یک شیءِ JSON است.
    """
    if not text:
        return False
    if any(marker in text for marker in _MACHINE_MARKERS):
        return True
    return text.startswith("{") and text.endswith("}")


def _rescue_bare_call(content):
    """شکلِ دومِ نشتی: نامِ ابزار **بیرونِ** JSON.

    ⚠️ دیده شد که مدل این را به‌عنوان متن می‌نویسد:

        find_customer{"query": "آخرین تراکنش"}

    اینجا هیچ کلیدِ `name`ی وجود ندارد، پس `_rescue_tool_calls` پیدایش نمی‌کند و
    همین رشته به‌عنوان جوابِ نهایی روی صفحه می‌نشست.

    نام از **فهرستِ ابزارهای خودمان** تشخیص داده می‌شود نه با الگوی عمومی: هر
    کلمه‌ای که قبلِ یک آکولاد بیاید ابزار نیست، و ساختنِ فراخوانی از یک نامِ
    ناشناخته یعنی خطای بعدی به‌جای رفعِ این یکی.

    آکولاد باید **بلافاصله** بعدِ نام بیاید (حداکثر با یک `:` یا `(` وسط).
    وگرنه جوابِ سالمی که اسمِ ابزاری را در متن آورده و جای دیگری آکولاد دارد
    هم به اشتباه «فراخوانی» شمرده می‌شد.
    """
    decoder = json.JSONDecoder()
    for name in sorted({tool["name"] for tool in TOOLS}, key=len, reverse=True):
        for match in re.finditer(rf"{re.escape(name)}\s*[:(=]?\s*(\{{)", content):
            try:
                payload, _ = decoder.raw_decode(content, match.start(1))
            except ValueError:
                continue
            if isinstance(payload, dict):
                return [_rescued(name, payload)]
    return None


def _rescued(name, arguments):
    """یک فراخوانیِ نجات‌یافته، به شکلی که سرور می‌پذیرد.

    ⚠️ `arguments` باید **رشتهٔ JSON** باشد نه شیء. این پیام دوباره به مدل
    فرستاده می‌شود و سرور با شیء، درخواست را ۴۰۰ می‌کند:
      cannot unmarshal object into ... arguments of type string
    """
    if not isinstance(arguments, str):
        arguments = json.dumps(arguments, ensure_ascii=False)
    return {
        "id": f"rescued_{name}",
        "type": "function",
        "function": {"name": name, "arguments": arguments},
    }


def _history(conversation, limit=10):
    """پیام‌های قبلیِ همین گفتگو، برای اینکه دستیار رشتهٔ حرف را گم نکند.

    فقط آخرین چندتا: تاریخچهٔ بلند هم کندتر است هم مدل را از سوالِ فعلی پرت می‌کند.
    """
    rows = conversation.messages.order_by("-created", "-id")[:limit]
    return [{"role": row.role, "content": row.body} for row in reversed(rows)]


def answer(user, conversation):
    """پاسخِ دستیار به آخرین پیامِ گفتگو.

    ⚠️ سوال جداگانه گرفته نمی‌شود: ویو پیامِ کاربر را **پیش از** این فراخوانی
    ذخیره می‌کند، پس آخرین ردیفِ تاریخچه خودِ همان سوال است. اگر جدا هم پاس
    می‌شد، سوال دو بار به مدل می‌رفت.

    خروجی: `(متن, ابزارهای_استفاده‌شده)`
    """
    if not is_configured():
        raise EngineNotConfigured(
            "دستیار پیکربندی نشده است. مقادیر LLM_BASE_URL و LLM_MODEL را در .env بگذارید."
        )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *_history(conversation),
    ]
    used = []
    nudges_left = GROUNDING_RETRIES
    retries_left = FORMAT_RETRIES

    for step in range(MAX_STEPS):
        message = _call_model(messages)
        calls = message.get("tool_calls") or []

        # مدل ابزار خواسته ولی سرور از متن بیرونش نکشیده — نجاتش می‌دهیم
        if not calls:
            rescued = (_rescue_tool_calls(message)
                       or _rescue_bare_call((message.get("content") or "").strip()))
            if rescued:
                logger.info("chat rescued tool call from content: %s", rescued[0]["function"]["name"])
                calls = rescued
                # پیامِ اصلی متنِ خام دارد و به دردِ تاریخچه نمی‌خورد
                message = {"role": "assistant", "content": "", "tool_calls": calls}

        if not calls:
            text = (message.get("content") or "").strip()

            # شکلِ ناشناختهٔ یک فراخوانی: نه نجات داده شد نه جواب است.
            # یک بار دوباره می‌پرسیم، و اگر باز هم همان بود متنِ خام را
            # **نشان نمی‌دهیم** — دیدنِ JSONِ داخلی از هیچ‌چیز بهتر نیست.
            if _looks_machine(text):
                logger.warning("chat produced machine output: %s", text[:200])
                if retries_left > 0:
                    retries_left -= 1
                    messages.append({"role": "assistant", "content": text})
                    messages.append({"role": "user", "content": FORMAT_NUDGE})
                    continue
                text = ""

            # عددِ بی‌پشتوانه: یک بار تذکر می‌دهیم و دوباره می‌پرسیم — همان
            # قاعدهٔ `answer_stream`. هر دو مسیر زنده‌اند، پس هر دو باید امن باشند.
            if not used and nudges_left > 0 and _has_numbers(text):
                nudges_left -= 1
                logger.warning("chat answered with numbers and no tool; nudging")
                messages.append({"role": "assistant", "content": text})
                messages.append({"role": "user", "content": GROUNDING_NUDGE})
                continue

            # تذکر خرج شده و مدل هنوز بی‌پشتوانه عدد می‌گوید — نشانش نمی‌دهیم
            if not used and _has_numbers(text):
                logger.warning("chat refused an ungrounded numeric answer")
                return GROUNDING_REFUSAL, used

            if not text:
                text = "پاسخی تولید نشد. لطفاً سوال را طور دیگری بپرسید."
            return text, used

        # مدل خواسته ابزار صدا زده شود — پیامِ خودش باید در تاریخچه بماند،
        # وگرنه مدل در دورِ بعد نمی‌داند چه چیزی خواسته بود
        messages.append(message)

        for call in calls:
            function = call.get("function") or {}
            name = function.get("name", "")
            raw = function.get("arguments") or "{}"
            try:
                arguments = json.loads(raw) if isinstance(raw, str) else raw
            except ValueError:
                arguments = {}

            result = run_tool(user, name, arguments)
            # ⚠️ **فقط ابزاری که واقعاً داده برگرداند اینجا ثبت می‌شود.**
            # `used` معنایش «جواب بر چه چیزی سوار است» است، نه «چه چیزی اجرا
            # شد». یک `find_customer` که چیزی پیدا نمی‌کند هیچ پشتوانه‌ای
            # نساخته — و دقیقاً همین بود که به مدل اجازه داد نام و تاریخِ
            # ساختگی بنویسد در حالی که گارد راضی بود.
            if name and name not in used and has_data(result):
                used.append(name)
            logger.info("chat tool %s(%s) -> %s", name, arguments, str(result)[:200])

            messages.append({
                "role": "tool",
                "tool_call_id": call.get("id", ""),
                "name": name,
                # ⚠️ ensure_ascii=False وگرنه فارسی به \uXXXX تبدیل می‌شود و
                # مدل باید آن را رمزگشایی کند — هم توکن هدر می‌رود هم خطا می‌آورد
                "content": json.dumps(result, ensure_ascii=False, default=str),
            })

    # به سقف خوردیم: مدل نتوانست جمع‌بندی کند
    logger.warning("chat loop hit MAX_STEPS with tools=%s", used)
    return "نتوانستم به جمع‌بندی برسم. لطفاً سوال را ساده‌تر بپرسید.", used


def answer_stream(user, conversation):
    """همان حلقهٔ `answer` ولی تکه‌تکه.

    رویدادهایی که بیرون می‌دهد:
        ("tool",  نامِ ابزار)   — پیش از اجرای هر ابزار
        ("delta", تکهٔ متن)      — حینِ نوشتنِ جواب
        ("done",  (متن, ابزارها, زمینه))

    ⚠️ چرا رویدادِ `tool` هم بیرون می‌رود؟ چون بینِ سوال و اولین حرفِ جواب،
    ابزار اجرا می‌شود و روی CPU همین چند دقیقه طول می‌کشد. بدونِ این رویداد
    کاربر فقط سکوت می‌بیند و فکر می‌کند چیزی کار نمی‌کند.
    """
    if not is_configured():
        raise EngineNotConfigured(
            "دستیار پیکربندی نشده است. مقادیر LLM_BASE_URL و LLM_MODEL را در .env بگذارید."
        )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *_history(conversation),
    ]
    used = []
    # شناسه‌هایی که دکمهٔ پیشنهاد به آن‌ها نیاز دارد (مثلاً کدام مشتری)
    context = {}
    text_parts = []
    nudges_left = GROUNDING_RETRIES
    retries_left = FORMAT_RETRIES

    for _step in range(MAX_STEPS):
        text_parts = []
        stream = _stream_model(messages)
        while True:
            try:
                piece = next(stream)
            except StopIteration as stop:
                message = stop.value or {"role": "assistant", "content": ""}
                break
            text_parts.append(piece)
            yield ("delta", piece)

        calls = message.get("tool_calls") or []
        if not calls:
            rescued = (_rescue_tool_calls(message)
                       or _rescue_bare_call((message.get("content") or "").strip()))
            if rescued:
                logger.info("chat rescued tool call from content: %s",
                            rescued[0]["function"]["name"])
                calls = rescued
                # ⚠️ متنِ خامِ فراخوانی روی صفحه رفته بود. با این رویداد به
                # فرانت می‌گوییم آنچه تا حالا نوشته را دور بریزد، وگرنه کاربر
                # JSONِ داخلیِ مدل را به‌عنوان جواب می‌بیند.
                if "".join(text_parts).strip():
                    yield ("reset", None)
                message = {"role": "assistant", "content": "", "tool_calls": calls}
                text_parts = []

        if not calls:
            text = "".join(text_parts).strip()

            # همان گاردِ `answer` — هر دو مسیر زنده‌اند، پس هر دو باید امن باشند
            if _looks_machine(text):
                logger.warning("chat produced machine output: %s", text[:200])
                yield ("reset", None)
                if retries_left > 0:
                    retries_left -= 1
                    messages.append({"role": "assistant", "content": text})
                    messages.append({"role": "user", "content": FORMAT_NUDGE})
                    continue
                text = ""

            # عددِ بی‌پشتوانه: یک بار تذکر می‌دهیم و دوباره می‌پرسیم
            if not used and nudges_left > 0 and _has_numbers(text):
                nudges_left -= 1
                logger.warning("chat answered with numbers and no tool; nudging")
                if text:
                    # آنچه نوشته شده ساختگی است و نباید روی صفحه بماند
                    yield ("reset", None)
                messages.append({"role": "assistant", "content": text})
                messages.append({"role": "user", "content": GROUNDING_NUDGE})
                continue

            # همان امتناعِ `answer` — و متنِ نوشته‌شده از صفحه پاک می‌شود
            if not used and _has_numbers(text):
                logger.warning("chat refused an ungrounded numeric answer")
                if text:
                    yield ("reset", None)
                yield ("delta", GROUNDING_REFUSAL)
                yield ("done", (GROUNDING_REFUSAL, used, context))
                return

            if not text:
                text = "پاسخی تولید نشد. لطفاً سوال را طور دیگری بپرسید."
                yield ("delta", text)
            yield ("done", (text, used, context))
            return

        messages.append(message)
        for call in calls:
            function = call.get("function") or {}
            name = function.get("name", "")
            raw = function.get("arguments") or "{}"
            try:
                arguments = json.loads(raw) if isinstance(raw, str) else raw
            except ValueError:
                arguments = {}

            yield ("tool", name)
            result = run_tool(user, name, arguments)
            # همان قاعدهٔ `answer`: پشتوانه یعنی دادهٔ برگشته، نه اجرای ابزار
            if name and name not in used and has_data(result):
                used.append(name)
            # شناسهٔ مشتری برای مقصدِ دکمهٔ پیشنهاد
            if isinstance(arguments, dict) and arguments.get("customer_id"):
                context["customer_id"] = arguments["customer_id"]
            logger.info("chat tool %s(%s) -> %s", name, arguments, str(result)[:200])

            messages.append({
                "role": "tool",
                "tool_call_id": call.get("id", ""),
                "name": name,
                "content": json.dumps(result, ensure_ascii=False, default=str),
            })

    logger.warning("chat stream hit MAX_STEPS with tools=%s", used)
    fallback = "نتوانستم به جمع‌بندی برسم. لطفاً سوال را ساده‌تر بپرسید."
    yield ("delta", fallback)
    yield ("done", (fallback, used, context))
