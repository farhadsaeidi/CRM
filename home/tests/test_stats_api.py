"""داشبورد و سه نوارِ شاخص.

قاعدهٔ مشترکی که اینجا سنجیده می‌شود: **شاخص‌ها کلِ دفتر را می‌گویند، نه نمای
فیلترشده را.** شاخصی که با تایپ در کادرِ جستجو تکان بخورد دیگر شاخص نیست.
"""
from django.urls import reverse
from rest_framework.test import APITestCase

from home.services import recalculate_account

from .factories import make_customer, make_owner, make_transaction, today_jalali


class DashboardTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = make_owner()
        today = today_jalali()

        cls.debtor = make_customer(cls.owner, "بدهکار", phone="09121110001")
        make_transaction(cls.owner, cls.debtor, debt=1_000_000,
                         jalali=(today.year, today.month, today.day))
        make_transaction(cls.owner, cls.debtor, paid=400_000,
                         jalali=(today.year, today.month, today.day))

        cls.creditor = make_customer(cls.owner, "بستانکار", phone="09121110002")
        make_transaction(cls.owner, cls.creditor, debt=100_000,
                         jalali=(today.year, today.month, today.day))
        make_transaction(cls.owner, cls.creditor, paid=300_000,
                         jalali=(today.year, today.month, today.day))

        cls.settled = make_customer(cls.owner, "تسویه", phone="09121110003")
        make_transaction(cls.owner, cls.settled, debt=50_000,
                         jalali=(today.year, today.month, today.day))
        make_transaction(cls.owner, cls.settled, paid=50_000,
                         jalali=(today.year, today.month, today.day))

        cls.untouched = make_customer(cls.owner, "بدون تراکنش", phone="09121110004")

        for customer in (cls.debtor, cls.creditor, cls.settled):
            recalculate_account(customer, cls.owner)

    def setUp(self):
        self.client.force_login(self.owner)

    def body(self, period="all"):
        return self.client.get(reverse("api:dashboard"), {"period": period}).json()

    def test_balance_is_paid_minus_debt_over_the_whole_ledger(self):
        kpi = self.body()["kpi"]
        self.assertEqual(kpi["balance"]["debt"], 1_150_000)
        self.assertEqual(kpi["balance"]["paid"], 750_000)
        self.assertEqual(kpi["balance"]["value"], -400_000)
        self.assertEqual(kpi["balance"]["transactions"], 6)

    def test_settled_and_untouched_are_counted_separately(self):
        """ستونِ کش‌شدهٔ code این دو را یکی می‌بیند؛ داشبورد نباید این کار را بکند."""
        mix = self.body()["mix"]
        self.assertEqual(mix["debt"], 1)
        self.assertEqual(mix["credit"], 1)
        self.assertEqual(mix["settled"], 1)
        self.assertEqual(mix["untouched"], 1)
        self.assertEqual(mix["total"], 4)

    def test_balance_ignores_the_period_while_flows_follow_it(self):
        """«چقدر طلبکارم» یک عددِ لحظه‌ای از کلِ دفتر است، نه مالِ یک بازه."""
        today = today_jalali()
        make_transaction(self.owner, self.debtor, debt=900_000, jalali=(today.year - 1, 3, 3))

        year = self.body("year")
        self.assertEqual(year["kpi"]["balance"]["value"], -1_300_000)
        self.assertEqual(year["kpi"]["debt"]["value"], 1_150_000)

    def test_collection_rate_is_capped_and_none_without_credit(self):
        rate = self.body()["kpi"]["rate"]["value"]
        self.assertAlmostEqual(rate, round(750_000 / 1_150_000 * 100, 1))

        empty_owner = make_owner()
        self.client.force_login(empty_owner)
        self.assertIsNone(self.body()["kpi"]["rate"]["value"])

    def test_delta_is_none_when_the_previous_period_is_empty(self):
        """با پایهٔ صفر درصدِ تغییر بی‌معناست — عددِ ساختگی بدتر از نبودنش است."""
        self.assertIsNone(self.body("year")["kpi"]["debt"]["delta"])

    def test_top_debtors_carry_their_share_of_the_total(self):
        body = self.body()
        self.assertEqual(body["debtors_total"]["count"], 1)
        self.assertEqual(body["debtors_total"]["amount"], 600_000)
        self.assertEqual(body["top_debtors"][0]["fullname"], "بدهکار")
        self.assertEqual(body["top_debtors"][0]["share"], 100.0)

    def test_best_payers_exclude_customers_who_never_took_credit(self):
        names = [row["fullname"] for row in self.body()["best_payers"]]
        self.assertNotIn("بدون تراکنش", names)
        self.assertEqual(names[0], "بستانکار")   # نسبتِ ۱۰۰٪ و سقف‌دار

    def test_aging_buckets_sum_to_the_total_debt(self):
        body = self.body()
        self.assertEqual(
            sum(bucket["amount"] for bucket in body["aging"]),
            body["debtors_total"]["amount"],
        )

    def test_trend_has_twelve_months_ending_this_month(self):
        trend = self.body()["trend"]
        self.assertEqual(len(trend), 12)
        today = today_jalali()
        self.assertEqual((trend[-1]["year"], trend[-1]["month"]), (today.year, today.month))

    def test_unknown_period_falls_back_to_the_default(self):
        self.assertEqual(self.body("bogus")["period"], "year")

    def test_empty_owner_gets_a_complete_but_zeroed_payload(self):
        self.client.force_login(make_owner())
        body = self.body()
        self.assertEqual(body["customers_total"], 0)
        self.assertEqual(body["kpi"]["balance"]["value"], 0)
        self.assertEqual(body["mix"]["total"], 0)
        self.assertEqual(body["top_debtors"], [])
        self.assertEqual(len(body["trend"]), 12)
        self.assertIsNone(body["concentration"]["top1_name"])


class CustomerStatsTests(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.client.force_login(self.owner)
        self.debtor = make_customer(self.owner, "بدهکار", phone="09121110001")
        make_transaction(self.owner, self.debtor, debt=800_000)
        make_transaction(self.owner, self.debtor, paid=200_000)
        make_customer(self.owner, "بدون تراکنش", phone="09121110002")
        recalculate_account(self.debtor, self.owner)

    def test_counts_and_amounts(self):
        body = self.client.get(reverse("api:customer_stats")).json()
        self.assertEqual(body["total"], 2)
        self.assertEqual(body["debtors"], {"count": 1, "amount": 600_000})
        self.assertEqual(body["creditors"], {"count": 0, "amount": 0})
        self.assertEqual(body["untouched"], 1)

    def test_stats_ignore_the_table_filter_and_search(self):
        """این endpoint اصلاً پارامتر نمی‌گیرد — تضمینِ ساختاریِ همان قاعده."""
        plain = self.client.get(reverse("api:customer_stats")).json()
        with_params = self.client.get(
            reverse("api:customer_stats"), {"query": "بدهکار", "filter": "debt"}
        ).json()
        self.assertEqual(plain, with_params)


class TransactionStatsTests(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.client.force_login(self.owner)
        self.customer = make_customer(self.owner, "مشتری")
        make_transaction(self.owner, self.customer, debt=600_000, jalali=(1405, 2, 10))
        make_transaction(self.owner, self.customer, debt=400_000, jalali=(1405, 2, 11))
        make_transaction(self.owner, self.customer, paid=500_000, jalali=(1405, 3, 1))

    def test_all_transactions_stats(self):
        body = self.client.get(reverse("api:all_transactions_stats")).json()
        self.assertEqual(body["total"], 3)
        self.assertEqual(body["debt"], {"amount": 1_000_000, "rows": 2})
        self.assertEqual(body["paid"], {"amount": 500_000, "rows": 1})
        self.assertEqual(body["turnover"], 1_500_000)
        self.assertEqual(body["average"], 500_000)
        self.assertEqual(body["largest"], 600_000)
        self.assertEqual(body["busiest"]["label"], "اردیبهشت")

    def test_ledger_stats_match_the_list_remainder(self):
        stats = self.client.get(reverse("api:transaction_stats", args=[self.customer.id])).json()
        ledger = self.client.get(reverse("api:transactions", args=[self.customer.id])).json()
        self.assertEqual(stats["balance"], ledger["remainder"])
        self.assertEqual(stats["balance"], -500_000)
        self.assertEqual(stats["first"], {"year": 1405, "month": 2, "day": 10})
        self.assertEqual(stats["last"], {"year": 1405, "month": 3, "day": 1})

    def test_ledger_stats_ignore_the_period_filter(self):
        filtered = self.client.get(
            reverse("api:transactions", args=[self.customer.id]), {"filter": "today"}
        ).json()
        stats = self.client.get(reverse("api:transaction_stats", args=[self.customer.id])).json()
        self.assertEqual(len(filtered["transactions"]), 0)
        self.assertEqual(stats["total"], 3)

    def test_customer_without_transactions_returns_nulls_not_errors(self):
        empty = make_customer(self.owner, "خالی", phone="09121119999")
        body = self.client.get(reverse("api:transaction_stats", args=[empty.id])).json()
        self.assertEqual(body["total"], 0)
        self.assertEqual(body["average"], 0)
        self.assertIsNone(body["rate"])
        self.assertIsNone(body["first"])
        self.assertIsNone(body["days_since_last"])
