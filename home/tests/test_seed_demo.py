"""دستورِ `seed_demo`.

اجرایش روی دیتابیسِ تست انجام می‌شود، پس دفترِ واقعی دست نمی‌خورد. چیزی که سنجیده
می‌شود این است: داده‌ای که می‌سازد به مالکِ درست وصل است، ستون‌های شمسی پر شده‌اند،
و وضعیتِ حساب‌ها با تراکنش‌ها جور است.
"""
from io import StringIO

from django.core.management import CommandError, call_command
from django.test import TestCase

from home.models import Customer, CustomerOwner, Transaction
from home.services import calculate_remainder

from .factories import make_customer, make_owner, make_transaction


class SeedDemoTests(TestCase):
    def setUp(self):
        self.owner = make_owner(phone="09121234567")
        self.out = StringIO()

    def seed(self, **kwargs):
        call_command("seed_demo", owner="09121234567", customers=kwargs.pop("customers", 12),
                     months=kwargs.pop("months", 6), seed=42, stdout=self.out, **kwargs)

    def test_it_creates_customers_linked_to_the_requested_owner(self):
        self.seed()
        self.assertEqual(CustomerOwner.objects.filter(owner=self.owner).count(), 12)
        self.assertEqual(Customer.objects.count(), 12)

    def test_every_transaction_belongs_to_the_owner_and_has_jalali_columns(self):
        self.seed()
        transactions = Transaction.objects.all()
        self.assertGreater(transactions.count(), 0)
        for transaction in transactions:
            self.assertEqual(transaction.owner_id, self.owner.id)
            self.assertIsNotNone(transaction.year)
            self.assertIsNotNone(transaction.month)
            self.assertIsNotNone(transaction.day)

    def test_every_row_has_exactly_one_non_zero_amount(self):
        """هر ردیف یا نسیه است یا پرداخت — ردیفِ صفر/صفر بی‌معناست."""
        self.seed()
        for transaction in Transaction.objects.all():
            self.assertNotEqual((transaction.debt, transaction.paid), (0, 0))

    def test_account_codes_agree_with_the_transactions(self):
        self.seed()
        for customer in Customer.objects.all():
            remainder = calculate_remainder(customer, self.owner)
            expected = 1 if remainder > 0 else (-1 if remainder < 0 else 0)
            self.assertEqual(customer.code, expected, msg=customer.fullname)

    def test_a_seeded_run_is_reproducible(self):
        self.seed()
        first = Transaction.objects.count()

        Transaction.objects.all().delete()
        CustomerOwner.objects.all().delete()
        Customer.objects.all().delete()

        self.seed()
        self.assertEqual(Transaction.objects.count(), first)

    def test_running_twice_adds_and_never_deletes(self):
        self.seed(customers=5)
        self.seed(customers=5)
        self.assertEqual(CustomerOwner.objects.filter(owner=self.owner).count(), 10)

    def test_clear_only_touches_the_requested_owner(self):
        other = make_owner()
        other_customer = make_customer(other, "مشتریِ مالکِ دیگر")
        make_transaction(other, other_customer, debt=500_000)

        self.seed(customers=5)
        call_command("seed_demo", owner="09121234567", customers=3, months=3,
                     seed=1, clear=True, yes=True, stdout=self.out)

        self.assertEqual(CustomerOwner.objects.filter(owner=self.owner).count(), 3)
        self.assertTrue(Customer.objects.filter(id=other_customer.id).exists())
        self.assertEqual(Transaction.objects.filter(owner=other).count(), 1)

    def test_unknown_owner_is_a_clean_error(self):
        with self.assertRaises(CommandError):
            call_command("seed_demo", owner="09129999999", stdout=self.out)
