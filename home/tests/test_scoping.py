"""اسکوپینگ و IDOR — مهم‌ترین تستِ این پروژه.

هر مالک فقط باید مشتریان و تراکنش‌های خودش را ببیند. این تست هر endpointِ دامنه را
با شناسهٔ **مالکِ دیگر** صدا می‌زند و انتظار دارد ۴۰۴ بگیرد، نه دادهٔ او.

چرا ۴۰۴ و نه ۴۰۳؟ چون ۴۰۳ خودش یک نشتِ اطلاعات است: می‌گوید «این شناسه وجود دارد
ولی مالِ تو نیست». ۴۰۴ چیزی لو نمی‌دهد.
"""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from home.models import Customer, Transaction

from .factories import make_customer, make_owner, make_transaction


class ScopingTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.alice = make_owner(fullname="آلیس")
        cls.bob = make_owner(fullname="باب")

        cls.alice_customer = make_customer(cls.alice, "مشتریِ آلیس")
        cls.bob_customer = make_customer(cls.bob, "مشتریِ باب")

        cls.alice_tx = make_transaction(cls.alice, cls.alice_customer, debt=500_000)
        cls.bob_tx = make_transaction(cls.bob, cls.bob_customer, debt=900_000)

    def setUp(self):
        self.client.force_login(self.alice)

    # ------------------------------------------------------------ فهرست‌ها

    def test_customer_list_shows_only_own_customers(self):
        response = self.client.get(reverse("api:customers"))
        names = [row["fullname"] for row in response.json()["results"]]
        self.assertEqual(names, ["مشتریِ آلیس"])

    def test_all_transactions_shows_only_own_rows(self):
        response = self.client.get(reverse("api:all_transactions"))
        ids = [row["id"] for row in response.json()["results"]]
        self.assertEqual(ids, [self.alice_tx.id])

    def test_dashboard_counts_only_own_data(self):
        response = self.client.get(reverse("api:dashboard"), {"period": "all"})
        body = response.json()
        self.assertEqual(body["customers_total"], 1)
        self.assertEqual(body["kpi"]["balance"]["debt"], 500_000)

    # ------------------------------------------------ دسترسی به شناسهٔ دیگری

    def test_cannot_read_another_owners_customer(self):
        response = self.client.get(reverse("api:customer_detail", args=[self.bob_customer.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_edit_another_owners_customer(self):
        response = self.client.patch(
            reverse("api:customer_detail", args=[self.bob_customer.id]),
            {"fullname": "دستکاری شده"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.bob_customer.refresh_from_db()
        self.assertEqual(self.bob_customer.fullname, "مشتریِ باب")

    def test_cannot_delete_another_owners_customer(self):
        response = self.client.delete(reverse("api:customer_detail", args=[self.bob_customer.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Customer.objects.filter(id=self.bob_customer.id).exists())

    def test_cannot_read_another_owners_ledger(self):
        response = self.client.get(reverse("api:transactions", args=[self.bob_customer.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_read_another_owners_ledger_stats(self):
        response = self.client.get(reverse("api:transaction_stats", args=[self.bob_customer.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_search_dates_in_another_owners_ledger(self):
        response = self.client.post(
            reverse("api:transaction_search", args=[self.bob_customer.id]), {}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_add_a_transaction_to_another_owners_customer(self):
        response = self.client.post(
            reverse("api:transactions", args=[self.bob_customer.id]),
            {"debt": 1000, "paid": 0}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Transaction.objects.filter(customer=self.bob_customer).count(), 1)

    def test_cannot_touch_another_owners_transaction(self):
        """حتی با مسیرِ درستِ مشتریِ خودش — شناسهٔ تراکنش مالِ دیگری است."""
        for method, kwargs in (
            ("get", {}),
            ("patch", {"data": {"debt": 1}, "format": "json"}),
            ("delete", {}),
        ):
            with self.subTest(method=method):
                url = reverse("api:transaction_detail", args=[self.alice_customer.id, self.bob_tx.id])
                response = getattr(self.client, method)(url, **kwargs)
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        self.bob_tx.refresh_from_db()
        self.assertEqual(self.bob_tx.debt, 900_000)

    def test_nonexistent_ids_are_404_not_500(self):
        for name, args in (
            ("api:customer_detail", [999_999]),
            ("api:transactions", [999_999]),
            ("api:transaction_stats", [999_999]),
        ):
            with self.subTest(endpoint=name):
                self.assertEqual(
                    self.client.get(reverse(name, args=args)).status_code,
                    status.HTTP_404_NOT_FOUND,
                )

    # ------------------------------------------------ یک مشتری، دو مالک

    def test_shared_customer_shows_each_owner_only_their_own_transactions(self):
        """یک شخص می‌تواند مشتریِ چند مالک باشد؛ دفترشان باید کاملاً جدا بماند."""
        from home.models import CustomerOwner
        shared = make_customer(self.alice, "مشتریِ مشترک")
        CustomerOwner.objects.create(customer=shared, owner=self.bob)
        make_transaction(self.alice, shared, debt=100_000)
        make_transaction(self.bob, shared, debt=700_000)

        alice_view = self.client.get(reverse("api:transactions", args=[shared.id])).json()
        self.assertEqual(len(alice_view["transactions"]), 1)
        self.assertEqual(alice_view["remainder"], -100_000)

        self.client.force_login(self.bob)
        bob_view = self.client.get(reverse("api:transactions", args=[shared.id])).json()
        self.assertEqual(len(bob_view["transactions"]), 1)
        self.assertEqual(bob_view["remainder"], -700_000)


class AuthenticationRequiredTests(APITestCase):
    """بدونِ ورود هیچ endpointِ دامنه‌ای نباید پاسخ بدهد."""

    def test_every_ledger_endpoint_rejects_anonymous(self):
        owner = make_owner()
        customer = make_customer(owner)
        transaction = make_transaction(owner, customer, debt=1000)

        endpoints = [
            ("get", reverse("api:customers")),
            ("get", reverse("api:customer_stats")),
            ("get", reverse("api:customer_detail", args=[customer.id])),
            ("get", reverse("api:dashboard")),
            ("get", reverse("api:all_transactions")),
            ("get", reverse("api:all_transactions_stats")),
            ("post", reverse("api:all_transactions_search")),
            ("get", reverse("api:transactions", args=[customer.id])),
            ("get", reverse("api:transaction_stats", args=[customer.id])),
            ("post", reverse("api:transaction_search", args=[customer.id])),
            ("get", reverse("api:transaction_detail", args=[customer.id, transaction.id])),
        ]
        for method, url in endpoints:
            with self.subTest(url=url):
                response = getattr(self.client, method)(url)
                self.assertIn(
                    response.status_code,
                    (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
                )
