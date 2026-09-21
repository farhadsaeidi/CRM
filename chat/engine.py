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
from urllib.parse import urlparse

from .catalog import resolve as resolve_model, supports_ui
from .tools import TOOLS, has_data, run_tool, tool_schemas
from .ui_tools import FUNCTION_TOOLS, run_ui_tool, ui_has_data, ui_prompt, ui_tool_schemas
from .widgets import build_widget

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

# پیام‌هایی که یعنی «نتوانستم»، نه یک جوابِ واقعی. یک‌جا تعریف می‌شوند چون
# بیرون از این فایل هم لازم‌اند: ردیفِ پیشنهادها نباید زیرِ یک شکست بنشیند.
NO_OUTPUT = "پاسخی تولید نشد. لطفاً سوال را طور دیگری بپرسید."
NO_SUMMARY = "نتوانستم به جمع‌بندی برسم. لطفاً سوال را ساده‌تر بپرسید."


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

FALLBACKS = (GROUNDING_REFUSAL, NO_OUTPUT, NO_SUMMARY)


def is_fallback(text):
    """آیا این متن یکی از پیام‌های «نتوانستم» است؟

    مقایسهٔ دقیق و نه «شامل بودن»: جوابِ واقعی هم ممکن است چنین جمله‌ای را نقل
    کند، و آن وقت یک پاسخِ سالم به اشتباه شکست شمرده می‌شد.
    """
    return (text or "").strip() in FALLBACKS


# ارقامِ لاتین، فارسی و عربی — عددی که ابزاری پشتش نیست، ساختهٔ مدل است
_DIGITS = re.compile(r"[0-9۰-۹٠-٩]")


def _has_numbers(text):
    return bool(_DIGITS.search(text or ""))


# کدِ رابط داخلِ حصارِ ``` است. اگر مدل حصار را جا بیندازد، از خطِ `root =` به
# بعد کد است — همان قاعده‌ای که فرانت هم برای جدا کردنِ متن و رابط دارد.
_FENCE = re.compile(r"```[^\n]*\n?(.*?)(?:```|\Z)", re.S)
_ROOT_LINE = re.compile(r"^root\s*=", re.M)


def split_ui(text):
    """(متنِ جواب, کدِ رابط یا None).

    ⚠️ گاردِ «عددِ بی‌پشتوانه» فقط روی **متن** اجرا می‌شود. کدِ رابط پر از رقم است
    (`limit: 10`، `@Round(x, 1)`) ولی هیچ‌کدام ادعا نیستند؛ عددهایی که کاربر
    می‌بیند را مرورگر هنگامِ رندر از `Query` می‌گیرد، نه از دستِ مدل.
    """
    text = text or ""
    fence = _FENCE.search(text)
    if fence:
        return f"{text[:fence.start()]}{text[fence.end():]}".strip(), fence.group(1).strip()
    root = _ROOT_LINE.search(text)
    if root:
        return text[:root.start()].strip(), text[root.start():].strip()
    return text.strip(), None


# جوابِ رابط‌دارِ بی‌متن، برای تاریخچهٔ مدلی که رابط نمی‌فهمد
UI_PLACEHOLDER = "[یک کارت یا جدول از دفتر نمایش داده شد]"

UI_GROUNDING_NUDGE = (
    "In your text you wrote numbers you did not read from a tool. Never put numbers in the "
    "text: the UI shows them live through Query(). Answer again with the same UI and a short "
    "Persian introduction that contains no digits."
)

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


# ⚠️ **حالتِ رابط پرامپتِ فارسیِ خودش را دارد، نه همان بالایی را.**
#
# پرامپتِ بالا برای جوابِ متنی نوشته شده: «ابزار را صدا بزن و عدد را با
# جداکننده بنویس». در آزمایشِ ۲۰۲۶-۰۹-۲۲ همان باعث شد مدل برای «وضعِ کلیِ دفترم؟»
# ابزار را صدا بزند و هفت عدد را در متن ردیف کند، به‌جای ساختنِ رابط — و برای
# «حسابِ رضا» مانده را زیرِ رابط **با حروف** تکرار کند («چهار میلیون و دویست
# هزار»)، که گاردِ رقم هم نمی‌دیدش.
UI_SYSTEM_PROMPT = """تو دستیارِ سامانهٔ «مدیریت مشتریان» هستی؛ یک دفترِ حسابِ نسیه و پرداختی.

کاربرِ تو صاحبِ کسب‌وکار است و دربارهٔ مشتریان و حساب‌هایش می‌پرسد.

قواعدِ کارت:
- همیشه فارسی و کوتاه جواب بده.
- **هر سوال دربارهٔ دادهٔ دفتر را با رابط جواب بده** (بدهی، مشتری، تراکنش، روند، وضعیتِ کلی).
  عددها را خودِ رابط هنگامِ نمایش از دفتر می‌خواند؛ متنِ تو فقط یک یا دو جملهٔ کوتاه برای معرفیِ آن است.
- در متن **هیچ عدد، مبلغ یا تاریخی** ننویس — نه با رقم، نه با حروف. تو داده را نمی‌بینی و هر عددی
  که بنویسی ساختگی است. نامِ مشتری را فقط وقتی بنویس که کاربر خودش گفته یا find_customer برگردانده.
- find_customer را **فقط وقتی** صدا بزن که کاربر نامِ یک مشتریِ مشخص را گفته، تا customer_id او را
  بگیری. اگر چند نفر پیدا شدند، بپرس منظورِ کاربر کدام است. برای هر سوالی دربارهٔ کلِ دفتر هیچ
  ابزاری صدا نزن؛ رابط داده را خودش می‌گیرد.
- کدام ابزار برای کدام سوال:
  • «بدهکاران»، «چه کسانی بدهکارند» → debtors
  • «وضعیت کلی»، «این ماه چطور بود» → overview، با فیلترِ دوره
  • «روند»، «ماه‌به‌ماه» → monthly_trend
  • «ترکیب مشتریان» → customer_mix
  • «سررسید»، «بدهی‌های کهنه» → debt_aging
  • «آخرین تراکنش‌ها» → recent_transactions
  • «حسابِ فلانی»، «تراکنش‌های فلانی» → find_customer، بعد customer_ledger و customer_transactions
  • «خوش‌حساب‌ترین» → best_payers
  • «چه کسی را پیگیری کنم» → dormant_customers
- سوالی که به دادهٔ دفتر ربطی ندارد (مثلاً طرزِ کار با برنامه) را فقط با متن جواب بده، بدونِ کد.

تو فقط می‌خوانی و نشان می‌دهی. هیچ‌وقت چیزی ثبت، ویرایش یا حذف نمی‌کنی و پیامکی نمی‌فرستی —
اگر کاربر چنین چیزی خواست، بگو باید خودش از دکمهٔ مربوطه اقدام کند."""

# عددِ حروفی هم عدد است. فهرست عمداً فقط واحدهای بزرگ است: «یک» و «دو» در هر
# جملهٔ عادی هستند، ولی «میلیون» در جملهٔ معرفیِ یک جدول جایی ندارد.
_NUMBER_WORDS = re.compile(r"هزار|میلیون|میلیارد")


def _ui_prose_has_numbers(prose):
    return _has_numbers(prose) or bool(_NUMBER_WORDS.search(prose or ""))


class EngineNotConfigured(Exception):
    """سه مقدارِ `.env` ست نشده‌اند."""


class EngineError(Exception):
    """ارتباط با مدل شکست خورد."""


def is_configured():
    return bool(settings.LLM_BASE_URL and settings.LLM_MODEL)


# میزبان‌هایی که «همین ماشین»‌اند و هرگز نباید از پراکسی رد شوند
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}


def _proxies():
    """پراکسیِ درخواست به مدل — وابسته به اینکه مدل کجاست.

    ⚠️ **این تصمیم نمی‌تواند ثابت باشد، و یک بار همین ثابت بودن دردسر شد.**

    اولامای محلی روی 127.0.0.1 است و اگر درخواستش از پراکسیِ سیستم رد شود
    می‌شکند؛ پس در کد `proxies={"http": None, "https": None}` نوشته شده بود. ولی
    همان خط یعنی مدلِ **ابری** هم هرگز از پراکسی رد نمی‌شود — و در شبکه‌ای که
    دسترسیِ مستقیم ندارد، اصلاً کار نمی‌کند.

    حالا `LLM_PROXY` در `.env` حرفِ آخر را می‌زند؛ اگر خالی بود میزبانِ محلی
    بدونِ پراکسی می‌رود و بقیه به `requests` سپرده می‌شوند تا از متغیرهای محیط
    بخواند. `None` یعنی «خودت تصمیم بگیر» — برخلافِ دیکشنری با مقدارِ None که
    یعنی «هیچ پراکسی‌ای، هرگز».
    """
    if settings.LLM_PROXY:
        return {"http": settings.LLM_PROXY, "https": settings.LLM_PROXY}
    host = (urlparse(settings.LLM_BASE_URL).hostname or "").lower()
    if host in _LOCAL_HOSTS:
        return {"http": None, "https": None}
    return None


def _call_model(messages, model=None, tools=None):
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
                "model": model or settings.LLM_MODEL,
                "messages": messages,
                "tools": tools or tool_schemas(),
                # دمای پایین: اینجا جای خلاقیت نیست، جای گزارشِ درست است
                "temperature": 0.2,
            },
            timeout=TIMEOUT_SECONDS,
            proxies=_proxies(),
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


def _stream_model(messages, model=None, tools=None):
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
                "model": model or settings.LLM_MODEL,
                "messages": messages,
                "tools": tools or tool_schemas(),
                "temperature": 0.2,
                "stream": True,
            },
            timeout=TIMEOUT_SECONDS,
            stream=True,
            proxies=_proxies(),
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


def _history(conversation, limit=10, keep_ui=False):
    """پیام‌های قبلیِ همین گفتگو، برای اینکه دستیار رشتهٔ حرف را گم نکند.

    فقط آخرین چندتا: تاریخچهٔ بلند هم کندتر است هم مدل را از سوالِ فعلی پرت می‌کند.

    ⚠️ مدلی که رابط نمی‌سازد، کدِ رابطِ جواب‌های قبلی را هم نمی‌بیند — گفتگو ممکن
    است با یک مدلِ ابری شروع شده و حالا مدلِ محلی جواب بدهد، و ۷B از روی آن کد
    فقط یاد می‌گیرد که کد بنویسد. مدلِ رابط‌ساز اما کدِ قبلی را لازم دارد تا
    «یک نمودار هم اضافه کن» را روی همان رابط بسازد.
    """
    rows = conversation.messages.order_by("-created", "-id")[:limit]
    history = []
    for row in reversed(rows):
        body = row.body
        if not keep_ui and row.role == "assistant":
            prose, code = split_ui(body)
            if code is not None:
                body = prose or UI_PLACEHOLDER
        history.append({"role": row.role, "content": body})
    return history


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

    # ⚠️ از `conversation.model` می‌آید نه از بدنهٔ درخواست: `resolve` فقط
    # شناسه‌های فهرستِ سفید را می‌پذیرد، پس کلاینت نمی‌تواند مدلِ دلخواه
    # (و گران) را به ارائه‌دهنده تحمیل کند.
    model = resolve_model(conversation.model)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *_history(conversation),
    ]
    used = []
    nudges_left = GROUNDING_RETRIES
    retries_left = FORMAT_RETRIES

    for step in range(MAX_STEPS):
        message = _call_model(messages, model)
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
                text = NO_OUTPUT
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
    return NO_SUMMARY, used


def answer_stream(user, conversation):
    """همان حلقهٔ `answer` ولی تکه‌تکه.

    رویدادهایی که بیرون می‌دهد:
        ("tool",   نامِ ابزار)   — پیش از اجرای هر ابزار
        ("widget", ویجت)         — بلافاصله بعد از ابزاری که داده برگرداند
        ("delta",  تکهٔ متن)      — حینِ نوشتنِ جواب
        ("done",   (متن, ابزارها, زمینه))

    ⚠️ چرا رویدادِ `tool` هم بیرون می‌رود؟ چون بینِ سوال و اولین حرفِ جواب،
    ابزار اجرا می‌شود و روی CPU همین چند دقیقه طول می‌کشد. بدونِ این رویداد
    کاربر فقط سکوت می‌بیند و فکر می‌کند چیزی کار نمی‌کند.

    ⚠️ ویجت **همان لحظه** می‌رود نه در `done`: جدولِ بدهکاران چند ثانیه بعد از
    سوال آماده است و متنِ جواب روی CPU چند دقیقه بعد. کاربر داده را زودتر از
    جمله‌ای که درباره‌اش ساخته می‌شود می‌بیند. (چرایی خودِ ویجت: `widgets.py`.)
    """
    if not is_configured():
        raise EngineNotConfigured(
            "دستیار پیکربندی نشده است. مقادیر LLM_BASE_URL و LLM_MODEL را در .env بگذارید."
        )

    # ⚠️ از `conversation.model` می‌آید نه از بدنهٔ درخواست: `resolve` فقط
    # شناسه‌های فهرستِ سفید را می‌پذیرد، پس کلاینت نمی‌تواند مدلِ دلخواه
    # (و گران) را به ارائه‌دهنده تحمیل کند.
    model = resolve_model(conversation.model)
    # ⚠️ **حالتِ رابط:** مدلِ ابری جوابش را با رابط (کارت، جدول، نمودار) می‌سازد و
    # عددها را مرورگر هنگامِ رندر از همان ابزارها می‌خواند، نه از متنِ مدل. پس
    # ابزارها هم ابزارهای رابط‌اند (`ui_tools.py`) تا شکلی که مدل می‌بیند همانی
    # باشد که صفحه می‌گیرد. مدلِ محلی همان مسیرِ قبلی را می‌رود.
    ui = supports_ui(model)
    tools = ui_tool_schemas() if ui else tool_schemas()
    system = f"{UI_SYSTEM_PROMPT}\n\n{ui_prompt()}" if ui else SYSTEM_PROMPT
    numeric = _ui_prose_has_numbers if ui else _has_numbers
    messages = [
        {"role": "system", "content": system},
        *_history(conversation, keep_ui=ui),
    ]
    used = []
    # شناسه‌هایی که دکمهٔ پیشنهاد به آن‌ها نیاز دارد (مثلاً کدام مشتری)
    context = {}
    # ابزار+آرگومان‌هایی که ویجتشان رفته. مدلِ کوچک گاهی همان ابزار را با همان
    # آرگومان دوباره صدا می‌زند؛ دو جدولِ یکسانِ پشتِ سرِ هم فقط شلوغی است.
    shown_widgets = set()
    text_parts = []
    nudges_left = GROUNDING_RETRIES
    retries_left = FORMAT_RETRIES

    for _step in range(MAX_STEPS):
        text_parts = []
        stream = _stream_model(messages, model, tools)
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

            # در حالتِ رابط فقط متنِ بیرونِ کد سنجیده می‌شود — چرایی‌اش کنارِ `split_ui`
            prose, code = split_ui(text) if ui else (text, None)

            # عددِ بی‌پشتوانه: یک بار تذکر می‌دهیم و دوباره می‌پرسیم
            if not used and nudges_left > 0 and numeric(prose):
                nudges_left -= 1
                logger.warning("chat answered with numbers and no tool; nudging")
                if text:
                    # آنچه نوشته شده ساختگی است و نباید روی صفحه بماند
                    yield ("reset", None)
                messages.append({"role": "assistant", "content": text})
                messages.append({"role": "user", "content": UI_GROUNDING_NUDGE if ui else GROUNDING_NUDGE})
                continue

            # همان امتناعِ `answer` — و متنِ نوشته‌شده از صفحه پاک می‌شود
            if not used and numeric(prose):
                logger.warning("chat refused an ungrounded numeric answer")
                if text:
                    yield ("reset", None)
                # ⚠️ رابط می‌ماند و فقط متن کنار می‌رود: عددهای رابط را مرورگر از
                # Query می‌خواند، پس ایرادِ متن به آن سرایت نمی‌کند
                final = f"```openui-lang\n{code}\n```" if code else GROUNDING_REFUSAL
                yield ("delta", final)
                yield ("done", (final, used, context))
                return

            if not text:
                text = NO_OUTPUT
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
            if ui and name not in FUNCTION_TOOLS:
                # نجات‌دهنده‌ها نامِ هر ابزاری را از متن بیرون می‌کشند؛ اینجا همان مرزِ
                # `FUNCTION_TOOLS` دوباره اجرا می‌شود تا عددی به دستِ مدل نرسد
                result = {"error": f"{name} is only available through Query() in the UI."}
            else:
                result = run_ui_tool(user, name, arguments) if ui else run_tool(user, name, arguments)
            # همان قاعدهٔ `answer`: پشتوانه یعنی دادهٔ برگشته، نه اجرای ابزار
            if name and name not in used and (ui_has_data(result) if ui else has_data(result)):
                used.append(name)
            # شناسهٔ مشتری برای مقصدِ دکمهٔ پیشنهاد
            if isinstance(arguments, dict) and arguments.get("customer_id"):
                context["customer_id"] = arguments["customer_id"]
            logger.info("chat tool %s(%s) -> %s", name, arguments, str(result)[:200])

            # در حالتِ رابط خودِ مدل رابط می‌سازد و ویجتِ ثابت کنارش تکرارِ همان
            # داده بود — تازه شکلِ خروجیِ ابزارهای رابط را هم نمی‌شناسد
            widget = None if ui else build_widget(name, arguments, result)
            if widget is not None:
                key = (name, json.dumps(arguments, sort_keys=True, ensure_ascii=False, default=str))
                if key not in shown_widgets:
                    shown_widgets.add(key)
                    yield ("widget", widget)

            messages.append({
                "role": "tool",
                "tool_call_id": call.get("id", ""),
                "name": name,
                "content": json.dumps(result, ensure_ascii=False, default=str),
            })

    logger.warning("chat stream hit MAX_STEPS with tools=%s", used)
    fallback = NO_SUMMARY
    yield ("delta", fallback)
    yield ("done", (fallback, used, context))
