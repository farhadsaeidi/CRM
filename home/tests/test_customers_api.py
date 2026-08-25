"""API مشتریان — فهرست، فیلتر، جستجو، صفحه‌بندی و کراد."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from home.models import AccountCode, Customer

from .factories import make_customer, make_owner, make_transaction


class CustomerListTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = make_owner()
        # سه وضعیتِ حساب، تا فیلترها واقعاً چیزی برای جدا کردن داشته باشند
        cls.debtor = make_customer(cls.owner, "بدهکار", phone="09121110000")
        make_transaction(cls.owner, cls.debtor, debt=500_000)

        cls.creditor = make_customer(cls.owner, "بستانکار", phone="09122220000")
        make_transaction(cls.owner, cls.creditor, paid=300_000)

        cls.settled = make_customer(cls.owner, "تسویه شده", phone="09123330000")
        make_transaction(cls.owner, cls.settled, debt=100_000)
        make_transaction(cls.owner, cls.settled, paid=100_000)

        for customer in (cls.debtor, cls.creditor, cls.settled):
            from home.services import recalculate_account
            recalculate_account(customer, cls.owner)

    def setUp(self):
        self.client.force_login(self.owner)

    def test_list_is_paginated_five_per_page(self):
        for index in range(4):
            make_customer(self.owner, f"مشتری {index}")
        body = self.client.get(reverse("api:customers")).json()
        self.assertEqual(body["count"], 7)
        self.assertEqual(len(body["results"]), 5)
        self.assertIsNotNone(body["next"])

    def test_filter_by_account_status(self):
        cases = {"debt": "بدهکار", "credit": "بستانکار", "zero": "تسویه شده"}
        for key, expected in cases.items():
            with self.subTest(filter=key):
                body = self.client.get(reverse("api:customers"), {"filter": key}).json()
                self.assertEqual([row["fullname"] for row in body["results"]], [expected])

    def test_search_matches_name_or_phone(self):
        by_name = self.client.get(reverse("api:customers"), {"query": "بده"}).json()
        self.assertEqual([row["fullname"] for row in by_name["results"]], ["بدهکار"])

        by_phone = self.client.get(reverse("api:customers"), {"query": "2220000"}).json()
        self.assertEqual([row["fullname"] for row in by_phone["results"]], ["بستانکار"])

    def test_status_label_comes_from_code(self):
        body = self.client.get(reverse("api:customers"), {"filter": "debt"}).json()
        row = body["results"][0]
        self.assertEqual(row["code"], AccountCode.DEBT)
        self.assertEqual(row["status"], "بدهکار")


class CustomerWriteTests(APITestCase):
    def setUp(self):
        self.owner = make_owner()
        self.client.force_login(self.owner)

    def test_create_links_the_customer_to_the_owner(self):
        response = self.client.post(
            reverse("api:customers"),
            {"fullname": "مشتری تازه", "phone": "09121234567"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        customer = Customer.objects.get(fullname="مشتری تازه")
        self.assertIn(self.owner, customer.owners.all())

    def test_phone_is_normalised_before_validation(self):
        """ارقام فارسی و پیش‌شمارهٔ بین‌المللی هم باید پذیرفته شوند."""
        response = self.client.post(
            reverse("api:customers"),
            {"fullname": "مشتری فارسی", "phone": "+۹۸۹۱۲۱۱۱۲۲۳۳"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["customer"]["phone"], "09121112233")

    def test_duplicate_phone_is_rejected_for_the_same_owner(self):
        make_customer(self.owner, "اولی", phone="09121234567")
        response = self.client.post(
            reverse("api:customers"),
            {"fullname": "دومی", "phone": "09121234567"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_same_phone_is_allowed_for_a_different_owner(self):
        """محدودیت در سطحِ مالک است نه سراسری — یک شخص می‌تواند مشتریِ چند نفر باشد."""
        other = make_owner()
        make_customer(other, "مشتریِ دیگری", phone="09121234567")
        response = self.client.post(
            reverse("api:customers"),
            {"fullname": "مشتریِ من", "phone": "09121234567"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_short_name_is_rejected(self):
        response = self.client.post(
            reverse("api:customers"), {"fullname": "ال", "phone": "09121234567"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_phone_is_rejected(self):
        response = self.client.post(
            reverse("api:customers"), {"fullname": "مشتری", "phone": "12345"}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_and_delete(self):
        customer = make_customer(self.owner, "قبلی")
        detail = reverse("api:customer_detail", args=[customer.id])

        response = self.client.patch(detail, {"fullname": "بعدی"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["customer"]["fullname"], "بعدی")

        response = self.client.delete(detail)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Customer.objects.filter(id=customer.id).exists())
