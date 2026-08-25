"""دادهٔ نمایشیِ دفترِ حساب — برای دیدنِ داشبورد در حالتی که واقعاً پُر است.

دادهٔ امروزِ پروژه (۳۳ مشتری، ۴۳ تراکنش در دو ماه) برای آزمودنِ API کافی است ولی
برای داشبورد نه: نمودارِ روند دو نقطه دارد، سررسیدِ بدهی تک‌سطلی است و هر KPIِ
«امروز/این هفته» صفر می‌شود. این دستور یک دفترِ شبیه‌سازی‌شدهٔ یک‌ساله می‌سازد.

    venv/bin/python manage.py seed_demo --owner 09120000000
    venv/bin/python manage.py seed_demo --owner 09120000000 --customers 60 --months 14
    venv/bin/python manage.py seed_demo --owner 09120000000 --clear

⚠️ بدونِ `--clear` چیزی حذف نمی‌شود؛ دادهٔ تازه به دفترِ همان مالک اضافه می‌شود.
`--clear` فقط مشتریان و تراکنش‌هایِ **همان مالک** را پاک می‌کند و برای امنیت
تاییدِ تعاملی می‌خواهد (با `--yes` رد می‌شود).
"""
import random

import jdatetime
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction as db_transaction
from django.utils import timezone

from account.models import MyUser
from home.models import Customer, CustomerOwner, Transaction
from home.services import recalculate_account

FIRST_NAMES = [
    "علی", "محمد", "حسین", "رضا", "مهدی", "امیر", "سعید", "مجید", "ناصر", "بهرام",
    "فاطمه", "زهرا", "مریم", "سمیه", "نرگس", "الهام", "شیوا", "پروانه", "لیلا", "آزاده",
    "کیوان", "بابک", "فرهاد", "سیامک", "پیمان", "نازنین", "مینا", "رویا", "سحر", "هدیه",
]
LAST_NAMES = [
    "احمدی", "محمدی", "حسینی", "رضایی", "موسوی", "کریمی", "جعفری", "قاسمی", "صادقی",
    "نوری", "مرادی", "بابایی", "شریفی", "کاظمی", "زارعی", "سلطانی", "فرهادی", "یزدانی",
    "طاهری", "عباسی", "نجفی", "امینی", "رحیمی", "خسروی", "بهرامی", "اسدی", "غفاری",
]

# سه الگویِ رفتاری تا دفتر یکنواخت نشود: خوش‌حساب، معمولی، بدحساب.
# نسبتِ پرداخت به نسیه در هر گروه فرق می‌کند و همین است که سررسیدِ بدهی و
# «خوش‌حساب‌ترین‌ها» را معنادار می‌کند.
PROFILES = [
    {"name": "خوش‌حساب", "weight": 40, "pay_ratio": (0.95, 1.10), "activity": (0.6, 1.0)},
    {"name": "معمولی", "weight": 40, "pay_ratio": (0.55, 0.95), "activity": (0.3, 0.8)},
    {"name": "بدحساب", "weight": 20, "pay_ratio": (0.05, 0.5), "activity": (0.1, 0.5)},
]

AMOUNTS = [50_000, 80_000, 120_000, 150_000, 200_000, 250_000, 300_000, 450_000,
           500_000, 750_000, 900_000, 1_200_000, 1_500_000, 2_000_000, 3_000_000]


class Command(BaseCommand):
    help = "ساختِ دادهٔ نمایشی برای داشبورد (مشتری و تراکنش) برای یک مالکِ مشخص"

    def add_arguments(self, parser):
        parser.add_argument("--owner", required=True,
                            help="شمارهٔ همراه یا شناسهٔ کاربریِ مالک")
        parser.add_argument("--customers", type=int, default=45, help="تعداد مشتریِ ساختگی")
        parser.add_argument("--months", type=int, default=12, help="چند ماهِ شمسی به عقب")
        parser.add_argument("--clear", action="store_true",
                            help="اول مشتریان و تراکنش‌های همین مالک را پاک کن")
        parser.add_argument("--yes", action="store_true", help="بدونِ پرسیدن ادامه بده")
        parser.add_argument("--seed", type=int, default=None, help="بذرِ تصادفی برای تکرارپذیری")

    def handle(self, *args, **options):
        rng = random.Random(options["seed"])
        owner = self._resolve_owner(options["owner"])

        if options["clear"]:
            self._clear(owner, confirmed=options["yes"])

        created_customers = self._make_customers(owner, options["customers"], options["months"], rng)
        tx_count = self._make_transactions(owner, created_customers, options["months"], rng)

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ {len(created_customers)} مشتری و {tx_count} تراکنش برای «{owner.fullname}» ساخته شد."
        ))

    # ------------------------------------------------------------------

    def _resolve_owner(self, value):
        query = {"id": value} if str(value).isdigit() and len(str(value)) < 10 else {"phone": value}
        try:
            return MyUser.objects.get(**query)
        except MyUser.DoesNotExist:
            raise CommandError(f"کاربری با {query} پیدا نشد.")

    def _clear(self, owner, confirmed):
        links = CustomerOwner.objects.filter(owner=owner)
        customer_ids = list(links.values_list("customer_id", flat=True))
        tx_count = Transaction.objects.filter(owner=owner).count()

        if not confirmed:
            self.stdout.write(self.style.WARNING(
                f"\n⚠️  {len(customer_ids)} مشتری و {tx_count} تراکنشِ «{owner.fullname}» حذف می‌شود."
            ))
            if input("برای ادامه yes بنویسید: ").strip().lower() != "yes":
                raise CommandError("لغو شد.")

        with db_transaction.atomic():
            Transaction.objects.filter(owner=owner).delete()
            links.delete()
            # مشتری‌ای که مالکِ دیگری هم دارد نباید حذف شود
            Customer.objects.filter(id__in=customer_ids, owners=None).delete()
        self.stdout.write(f"🗑  {len(customer_ids)} مشتری و {tx_count} تراکنش حذف شد.")

    def _make_customers(self, owner, count, months, rng):
        """مشتریان در طولِ همان بازه ثبت می‌شوند، نه همه در یک روز.

        بدونِ این، کاشیِ «آخرین مشتریان» و هر نمودارِ رشدِ مشتری بی‌معنا می‌شود.
        """
        now = timezone.localtime()
        span_days = months * 30
        customers = []

        with db_transaction.atomic():
            for index in range(count):
                fullname = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
                phone = f"09{rng.randint(10, 39)}{rng.randint(1000000, 9999999)}"
                # هرچه به امروز نزدیک‌تر، ثبت‌نامِ بیشتر — رشدِ طبیعیِ یک کسب‌وکار
                age_days = int(span_days * (rng.random() ** 1.6))
                created = now - timezone.timedelta(days=age_days,
                                                   hours=rng.randint(0, 23),
                                                   minutes=rng.randint(0, 59))
                customer = Customer.objects.create(fullname=fullname, phone=phone, created=created)
                CustomerOwner.objects.create(customer=customer, owner=owner)
                profile = rng.choices(PROFILES, weights=[p["weight"] for p in PROFILES])[0]
                customers.append((customer, profile, created))
                if (index + 1) % 10 == 0:
                    self.stdout.write(f"  … {index + 1} مشتری")
        return customers

    def _make_transactions(self, owner, customers, months, rng):
        """تراکنش‌ها بینِ تاریخِ ثبتِ مشتری و امروز پخش می‌شوند.

        هر مشتری اول نسیه می‌گیرد و بعد بخشی از آن را می‌پردازد؛ نسبتِ پرداخت از
        پروفایلِ رفتاری‌اش می‌آید. `created` جداگانه ست می‌شود چون مدل ستون‌های
        شمسی را داخل save() از روی همان می‌سازد.
        """
        now = timezone.localtime()
        total = 0

        for customer, profile, registered in customers:
            days_available = max(1, (now - registered).days)
            # فعالیت: چند تراکنش در ماه
            per_month = rng.uniform(*profile["activity"]) * 4
            count = max(0, int(per_month * days_available / 30))
            # ۱۵٪ مشتریان عمداً هیچ تراکنشی ندارند — همان‌طور که در دفترِ واقعی هست
            if rng.random() < 0.15:
                count = 0

            pay_ratio = rng.uniform(*profile["pay_ratio"])
            rows = []
            for _ in range(count):
                moment = registered + timezone.timedelta(
                    days=rng.randint(0, days_available),
                    hours=rng.randint(8, 21), minutes=rng.randint(0, 59),
                )
                amount = rng.choice(AMOUNTS)
                # حدودِ دوسومِ ردیف‌ها نسیه‌اند و بقیه پرداخت — دفترِ نسیه همین شکلی است
                if rng.random() < 0.62:
                    rows.append(Transaction(owner=owner, customer=customer,
                                            debt=amount, paid=0, created=moment))
                else:
                    paid = int(amount * pay_ratio / 100_000) * 100_000 or 50_000
                    rows.append(Transaction(owner=owner, customer=customer,
                                            debt=0, paid=paid, created=moment))

            with db_transaction.atomic():
                for row in rows:
                    # bulk_create صدا نمی‌زند save() را، و ستون‌های شمسی خالی می‌مانند
                    row.save()
                recalculate_account(customer, owner)
            total += len(rows)

        return total
