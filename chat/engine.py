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

import requests
from django.conf import settings

from .tools import run_tool, tool_schemas

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

SYSTEM_PROMPT = """تو دستیارِ سامانهٔ «مدیریت مشتریان» هستی؛ یک دفترِ حسابِ نسیه و پرداختی.

کاربرِ تو صاحبِ کسب‌وکار است و دربارهٔ مشتریان و حساب‌هایش می‌پرسد.

قواعدِ کارت:
- همیشه فارسی و کوتاه جواب بده، مثلِ یک حسابدارِ کاربلد نه یک ربات.
- هیچ عددی از خودت نساز. هر رقمی که می‌گویی باید از خروجیِ **همین گفتگو** و از
  ابزاری که تازه صدا زده‌ای آمده باشد.
- برای **هر** سوالِ تازه که به عدد نیاز دارد، دوباره ابزار را صدا بزن — حتی اگر
  چند لحظه پیش سوالِ شبیهی پرسیده شده. اعداد ممکن است عوض شده باشند و جوابِ
  حفظی همیشه غلط است.
- اگر ابزاری صدا نزده‌ای، حق نداری هیچ رقمی بنویسی. به‌جایش بگو باید نگاه کنی.
- اگر برای جواب دادن به داده نیاز داری، اول ابزارِ مناسب را صدا بزن.
- اگر ابزار خطا برگرداند یا داده‌ای نبود، صادقانه بگو نمی‌دانی. حدس نزن.
- مبلغ‌ها به تومان‌اند. آن‌ها را با جداکنندهٔ سه‌رقمی بنویس.
- برای یافتنِ یک مشتریِ خاص، اول find_customer را صدا بزن تا شناسه‌اش را بگیری،
  بعد customer_ledger را با همان شناسه.
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
        # ⚠️ `arguments` باید **رشتهٔ JSON** باشد نه شیء. این پیام دوباره به مدل
        # فرستاده می‌شود و سرور با شیء، درخواست را ۴۰۰ می‌کند:
        #   cannot unmarshal object into ... arguments of type string
        if not isinstance(arguments, str):
            arguments = json.dumps(arguments, ensure_ascii=False)
        return [{
            "id": f"rescued_{name}",
            "type": "function",
            "function": {"name": name, "arguments": arguments},
        }]


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

    for step in range(MAX_STEPS):
        message = _call_model(messages)
        calls = message.get("tool_calls") or []

        # مدل ابزار خواسته ولی سرور از متن بیرونش نکشیده — نجاتش می‌دهیم
        if not calls:
            rescued = _rescue_tool_calls(message)
            if rescued:
                logger.info("chat rescued tool call from content: %s", rescued[0]["function"]["name"])
                calls = rescued
                # پیامِ اصلی متنِ خام دارد و به دردِ تاریخچه نمی‌خورد
                message = {"role": "assistant", "content": "", "tool_calls": calls}

        if not calls:
            text = (message.get("content") or "").strip()
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
            if name and name not in used:
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
            rescued = _rescue_tool_calls(message)
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
            if name and name not in used:
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
