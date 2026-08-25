"""واحدهای `home/services.py` — بدونِ HTTP.

منطقِ دامنه اینجاست، پس مستقیم سنجیده می‌شود؛ تستِ endpoint فقط می‌گوید سیم‌کشی
درست است، نه اینکه قاعده درست است.
"""
from django.test import TestCase

from home.models import AccountCode
from home.services import (
    account_code_from_remainder,
    build_date_search_query,
    calculate_remainder,
    recalculate_account,
)

from .factories import make_customer, make_owner, make_transaction


class AccountCodeTests(TestCase):
    def test_sign_of_the_remainder_decides_the_code(self):
        self.assertEqual(account_code_from_remainder(5), AccountCode.CREDIT)
        self.assertEqual(account_code_from_remainder(-5), AccountCode.DEBT)
        self.assertEqual(account_code_from_remainder(0), AccountCode.ZERO)


class RemainderTests(TestCase):
    def setUp(self):
        self.owner = make_owner()
        self.customer = make_customer(self.owner)

    def test_remainder_is_paid_minus_debt(self):
        make_transaction(self.owner, self.customer, debt=700_000)
        make_transaction(self.owner, self.customer, paid=250_000)
        self.assertEqual(calculate_remainder(self.customer, self.owner), -450_000)

    def test_remainder_counts_only_this_owners_rows(self):
        other = make_owner()
        from home.models import CustomerOwner
        CustomerOwner.objects.create(customer=self.customer, owner=other)

        make_transaction(self.owner, self.customer, debt=100_000)
        make_transaction(other, self.customer, debt=900_000)

        self.assertEqual(calculate_remainder(self.customer, self.owner), -100_000)
        self.assertEqual(calculate_remainder(self.customer, other), -900_000)

    def test_customer_without_transactions_has_a_zero_remainder(self):
        self.assertEqual(calculate_remainder(self.customer, self.owner), 0)

    def test_recalculate_writes_the_code_only_when_it_changes(self):
        make_transaction(self.owner, self.customer, debt=100_000)
        remainder, code = recalculate_account(self.customer, self.owner)
        self.assertEqual(remainder, -100_000)
        self.assertEqual(code, AccountCode.DEBT)

        self.customer.refresh_from_db()
        self.assertEqual(self.customer.code, AccountCode.DEBT)


class DateSearchQueryTests(TestCase):
    """سه حالتِ هر جزء، و تفاوتِ کلیدیِ سال با ماه/روز."""

    def test_empty_input_produces_no_query(self):
        self.assertIsNone(build_date_search_query(None, None, None))
        self.assertIsNone(build_date_search_query({}, {}, {}))

    def test_specific_value(self):
        query = build_date_search_query({"specific": 1405}, None, None)
        self.assertEqual(dict(query.children), {"year": 1405})

    def test_persian_digits_are_normalised(self):
        query = build_date_search_query({"specific": "۱۴۰۵"}, None, None)
        self.assertEqual(dict(query.children), {"year": 1405})

    def test_garbage_input_is_ignored_rather_than_crashing(self):
        self.assertIsNone(build_date_search_query({"specific": "abc"}, None, None))

    def test_month_range_that_wraps_the_year_becomes_an_or(self):
        """۱۱ تا ۲ یعنی بهمن تا اردیبهشت — بازهٔ دایره‌ای."""
        query = build_date_search_query(None, {"range": [11, 2]}, None)
        self.assertEqual(query.connector, "OR")

    def test_year_range_is_never_circular(self):
        """در سال بازهٔ دایره‌ای بی‌معناست؛ دو سرِ جابه‌جا فقط عوض می‌شوند."""
        query = build_date_search_query({"range": [1405, 1400]}, None, None)
        self.assertEqual(query.connector, "AND")
        self.assertEqual(dict(query.children), {"year__gte": 1400, "year__lte": 1405})

    def test_custom_list(self):
        query = build_date_search_query(None, {"custom": [2, 12]}, None)
        self.assertEqual(dict(query.children), {"month__in": [2, 12]})

    def test_components_are_combined_with_and(self):
        query = build_date_search_query({"specific": 1405}, {"specific": 2}, {"specific": 19})
        self.assertEqual(query.connector, "AND")
        self.assertEqual(len(query.children), 3)
