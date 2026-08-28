"""پیشنهادِ عملِ بعدی، بعد از هر پاسخ.

⚠️ **از روی ابزارهای استفاده‌شده ساخته می‌شود، نه با یک فراخوانیِ دومِ مدل.**
سه دلیل، به ترتیبِ اهمیت:

۱. **دکمه به مقصد نیاز دارد، نه فقط متن.** جمله‌ای که مدل بسازد یک رشتهٔ زیباست
   که هیچ‌جا نمی‌رود. اینجا هر پیشنهاد یک `action` دارد که فرانت می‌داند با آن
   چه کند — مسیری باز کند یا مودالی.
۲. **همیشه مرتبط است.** ابزاری که واقعاً اجرا شده، بهترین نشانهٔ موضوعِ گفتگوست؛
   مدل گاهی پیشنهادِ بی‌ربط می‌داد.
۳. روی CPU یک فراخوانیِ اضافه چند دقیقه است — گران‌تر از خودِ جواب.

اگر روزی مدل سریع شد و پیشنهادِ آزادتری خواستید، امضای `build_suggestion` همان
می‌ماند و فقط درونش عوض می‌شود.
"""

# آخرین ابزارِ صدا زده‌شده معیار است، نه اولی: مسیرِ گفتگو معمولاً از کلی به
# جزئی می‌رود (اول جستجوی مشتری، بعد دفترش) و آخرین قدم همان چیزی است که
# کاربر واقعاً دنبالش بود.
SUGGESTIONS = {
    "debtors": {
        "label": "یادآوری به بدهکاران",
        "action": "debt_reminder",
    },
    "customer_ledger": {
        "label": "مشاهدهٔ دفتر مشتری",
        "action": "customer_ledger",
    },
    "find_customer": {
        "label": "مشاهدهٔ فهرست مشتریان",
        "action": "customers",
    },
    "customer_summary": {
        "label": "مشاهدهٔ فهرست مشتریان",
        "action": "customers",
    },
    "transaction_summary": {
        "label": "مشاهدهٔ همهٔ تراکنش‌ها",
        "action": "transactions",
    },
    "overview": {
        "label": "مشاهدهٔ داشبورد",
        "action": "dashboard",
    },
}


# پیشنهادهایی که همیشه به کار می‌آیند و به ابزارِ خاصی گره نخورده‌اند. برای پر
# کردنِ جای خالی وقتی ابزارِ اجراشده فقط یک پیشنهاد دارد.
GENERAL = [
    {"label": "مشاهدهٔ داشبورد", "action": "dashboard"},
    {"label": "مشاهدهٔ فهرست مشتریان", "action": "customers"},
    {"label": "مشاهدهٔ همهٔ تراکنش‌ها", "action": "transactions"},
]

# ⚠️ سقفِ سه‌تا. با بیشتر از این، ردیفِ پیشنهادها زیرِ کادرِ نوشتن می‌شکند و
# به‌جای کمک، شلوغی می‌شود.
MAX_SUGGESTIONS = 3


def build_suggestions(tools_used, context=None):
    """تا سه پیشنهادِ عمل، بر پایهٔ ابزارهای اجراشده.

    ترتیب از خاص به عام است: اول پیشنهادِ ابزارهایی که واقعاً اجرا شدند (از
    آخری به اولی، چون مسیرِ گفتگو از کلی به جزئی می‌رود)، بعد اگر جا ماند با
    مقصدهای عمومی پر می‌شود.

    بدونِ ابزار، پیشنهادی هم نیست: اگر دستیار فقط سلام کرده، ردیفِ دکمه‌های
    چسبانده به آن مزاحمت است نه کمک.
    """
    if not tools_used:
        return []

    out = []
    seen = set()

    def add(item):
        if len(out) >= MAX_SUGGESTIONS or item["action"] in seen:
            return
        seen.add(item["action"])
        out.append(item)

    for name in reversed(tools_used):
        template = SUGGESTIONS.get(name)
        if template is None:
            continue
        suggestion = dict(template)
        # مقصدِ «دفترِ مشتری» بدونِ شناسه بی‌معناست؛ آن را رد می‌کنیم تا دکمه
        # به جای خالی نبرد
        if suggestion["action"] == "customer_ledger":
            customer_id = (context or {}).get("customer_id")
            if not customer_id:
                continue
            suggestion["customer_id"] = customer_id
        add(suggestion)

    # هیچ ابزارِ شناخته‌شده‌ای اجرا نشده — پیشنهادی هم نمی‌سازیم
    if not out:
        return []

    for item in GENERAL:
        add(dict(item))
    return out
