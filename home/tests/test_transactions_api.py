"""API تراکنش‌ها — دفترِ یک مشتری، جدولِ همه، فیلترِ دوره و جستجوی تاریخ."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from home.models import AccountCode, Transaction

from .factories import make_customer, make_owner, make_transaction, today_jalali


class LedgerTests(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.customer = make_customer(self.owner, "مشتری")
        self.client.force_login(self.owner)
        self.url = reverse("api:transactions", args=[self.customer.id])

    def test_list_returns_customer_transactions_and_remainder(self):
        make_transaction(self.owner, self.customer, debt=500_000)
        make_transaction(self.owner, self.customer, paid=200_000)

        body = self.client.get(self.url).json()
        self.assertEqual(len(body["transactions"]), 2)
        self.assertEqual(body["remainder"], -300_000)
        self.assertEqual(body["customer"]["fullname"], "مشتری")

    def test_ledger_is_not_paginated(self):
        """صفحه‌بندی نداریم چون مانده باید روی کلِ حساب گفته شود."""
        for _ in range(30):
            make_transaction(self.owner, self.customer, debt=1000)
        body = self.client.get(self.url).json()
        self.assertEqual(len(body["transactions"]), 30)
        self.assertNotIn("count", body)

    def test_remainder_ignores_the_period_filter(self):
        """فیلترِ دوره فقط ردیف‌ها را کم می‌کند؛ مانده همیشه کلِ حساب است."""
        today = today_jalali()
        make_transaction(self.owner, self.customer, debt=500_000,
                         jalali=(today.year, today.month, today.day))
        make_transaction(self.owner, self.customer, debt=300_000, jalali=(today.year - 1, 5, 10))

        body = self.client.get(self.url, {"filter": "year"}).json()
        self.assertEqual(len(body["transactions"]), 1)
        self.assertEqual(body["remainder"], -800_000)

    def test_creating_a_transaction_recalculates_the_account(self):
        response = self.client.post(self.url, {"debt": 400_000, "paid": 0}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["remainder"], -400_000)

        self.customer.refresh_from_db()
        self.assertEqual(self.customer.code, AccountCode.DEBT)

    def test_deleting_a_transaction_recalculates_the_account(self):
        transaction = make_transaction(self.owner, self.customer, debt=400_000)
        from home.services import recalculate_account
        recalculate_account(self.customer, self.owner)

        response = self.client.delete(
            reverse("api:transaction_detail", args=[self.customer.id, transaction.id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["remainder"], 0)

        self.customer.refresh_from_db()
        self.assertEqual(self.customer.code, AccountCode.ZERO)

    def test_a_transaction_with_two_zero_amounts_is_rejected(self):
        response = self.client.post(self.url, {"debt": 0, "paid": 0}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Transaction.objects.count(), 0)

    def test_negative_amounts_are_rejected(self):
        response = self.client.post(self.url, {"debt": -100, "paid": 0}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_jalali_columns_are_filled_on_save(self):
        transaction = make_transaction(self.owner, self.customer, debt=1000, jalali=(1405, 2, 19))
        self.assertEqual((transaction.year, transaction.month, transaction.day), (1405, 2, 19))


class DateSearchTests(APITestCase):
    """جستجوی تاریخ — سه حالتِ مشخص/بازه/دلخواه، با بازهٔ دایره‌ای و ارقام فارسی."""

    @classmethod
    def setUpTestData(cls):
        cls.owner = make_owner()
        cls.customer = make_customer(cls.owner, "مشتری")
        for month, day in ((1, 5), (2, 19), (6, 1), (11, 20), (12, 25)):
            make_transaction(cls.owner, cls.customer, debt=1000, jalali=(1405, month, day))

    def setUp(self):
        self.client.force_login(self.owner)
        self.url = reverse("api:transaction_search", args=[self.customer.id])

    def search(self, payload):
        return self.client.post(self.url, payload, format="json").json()["transactions"]

    def test_empty_payload_returns_everything(self):
        self.assertEqual(len(self.search({})), 5)

    def test_specific_year(self):
        self.assertEqual(len(self.search({"year": {"specific": 1405}})), 5)
        self.assertEqual(len(self.search({"year": {"specific": 1400}})), 0)

    def test_specific_month(self):
        self.assertEqual(len(self.search({"month": {"specific": 2}})), 1)

    def test_month_range(self):
        self.assertEqual(len(self.search({"month": {"range": [1, 6]}})), 3)

    def test_circular_month_range_wraps_around_the_year(self):
        """۱۱ تا ۲ یعنی بهمن، اسفند، فروردین، اردیبهشت — نه «هیچ»."""
        self.assertEqual(len(self.search({"month": {"range": [11, 2]}})), 4)

    def test_custom_month_list(self):
        self.assertEqual(len(self.search({"month": {"custom": [2, 12]}})), 2)

    def test_persian_digits_are_accepted(self):
        self.assertEqual(len(self.search({"month": {"specific": "۲"}})), 1)

    def test_components_combine_with_and(self):
        self.assertEqual(len(self.search({"year": {"specific": 1405}, "month": {"specific": 6}})), 1)
        self.assertEqual(len(self.search({"year": {"specific": 1404}, "month": {"specific": 6}})), 0)

    def test_search_still_reports_the_whole_account_remainder(self):
        body = self.client.post(self.url, {"month": {"specific": 2}}, format="json").json()
        self.assertEqual(len(body["transactions"]), 1)
        self.assertEqual(body["remainder"], -5000)


class AllTransactionsTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = make_owner()
        cls.first = make_customer(cls.owner, "مشتری اول", phone="09121110001")
        cls.second = make_customer(cls.owner, "مشتری دوم", phone="09121110002")
        for _ in range(8):
            make_transaction(cls.owner, cls.first, debt=1000)
        for _ in range(5):
            make_transaction(cls.owner, cls.second, paid=2000)

    def setUp(self):
        self.client.force_login(self.owner)

    def test_rows_carry_the_customer_name(self):
        row = self.client.get(reverse("api:all_transactions")).json()["results"][0]
        self.assertIn("customer_fullname", row)
        self.assertIn("customer_id", row)

    def test_page_size_is_controlled_by_the_client(self):
        body = self.client.get(reverse("api:all_transactions"), {"page_size": 4}).json()
        self.assertEqual(body["count"], 13)
        self.assertEqual(len(body["results"]), 4)

    def test_page_size_is_capped_at_one_hundred(self):
        body = self.client.get(reverse("api:all_transactions"), {"page_size": 5000}).json()
        self.assertEqual(len(body["results"]), 13)

    def test_pages_do_not_overlap_or_skip(self):
        seen = []
        for page in (1, 2, 3):
            body = self.client.get(
                reverse("api:all_transactions"), {"page": page, "page_size": 5}
            ).json()
            seen += [row["id"] for row in body["results"]]
        self.assertEqual(len(seen), 13)
        self.assertEqual(len(set(seen)), 13)

    def test_query_filters_by_customer_name(self):
        body = self.client.get(reverse("api:all_transactions"), {"query": "دوم"}).json()
        self.assertEqual(body["count"], 5)

    def test_date_search_endpoint_is_paginated_too(self):
        response = self.client.post(
            reverse("api:all_transactions_search") + "?page_size=6", {}, format="json",
        )
        body = response.json()
        self.assertEqual(body["count"], 13)
        self.assertEqual(len(body["results"]), 6)
