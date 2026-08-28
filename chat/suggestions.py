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


def build_suggestion(tools_used, context=None):
    """پیشنهادِ عمل بر پایهٔ آخرین ابزارِ اجراشده.

    بدونِ ابزار، پیشنهادی هم نیست: اگر دستیار فقط سلام کرده، پیشنهادِ چسبانده
    به آن مزاحمت است نه کمک.

    `context` شناسه‌هایی را می‌رساند که مقصدِ دکمه به آن‌ها نیاز دارد (مثلاً
    شناسهٔ مشتری برای رفتن به دفترش).
    """
    if not tools_used:
        return None

    for name in reversed(tools_used):
        template = SUGGESTIONS.get(name)
        if template is None:
            continue
        suggestion = dict(template)
        # مقصدِ «دفترِ مشتری» بدونِ شناسه بی‌معناست؛ اگر نداشتیم به فهرستِ
        # مشتریان برمی‌گردیم تا دکمه به جای خالی نبرد
        if suggestion["action"] == "customer_ledger":
            customer_id = (context or {}).get("customer_id")
            if not customer_id:
                continue
            suggestion["customer_id"] = customer_id
        return suggestion
    return None
