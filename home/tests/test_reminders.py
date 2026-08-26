"""یادآوریِ پیامکیِ بدهی.

⚠️ همه با `SMS_DEV_MODE=True` اجرا می‌شوند: هیچ پیامکی واقعاً ارسال نمی‌شود و
فقط در `SMSLog` ثبت می‌گردد — همان چیزی که بازهٔ خاموشی هم رویش کار می‌کند.
"""
from django.conf import settings
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from account.models import SMSLog
from home.reminders import COOLDOWN_HOURS, REMINDER_EVENT, format_amount

from .factories import make_customer, make_owner, make_transaction


@override_settings(SMS_DEV_MODE=True)
class DebtorListTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = make_owner(business_name="سوپرمارکت رضا")

        cls.debtor = make_customer(cls.owner, "الف بدهکار", phone="09121110001")
        make_transaction(cls.owner, cls.debtor, debt=900_000)
        make_transaction(cls.owner, cls.debtor, paid=400_000)   # مانده: ۵۰۰٬۰۰۰ بدهکار

        cls.big_debtor = make_customer(cls.owner, "ب بدهکارِ بزرگ", phone="09121110002")
        make_transaction(cls.owner, cls.big_debtor, debt=2_000_000)

        cls.creditor = make_customer(cls.owner, "ج بستانکار", phone="09121110003")
        make_transaction(cls.owner, cls.creditor, paid=250_000)

        cls.settled = make_customer(cls.owner, "د تسویه‌شده", phone="09121110004")
        make_transaction(cls.owner, cls.settled, debt=100_000)
        make_transaction(cls.owner, cls.settled, paid=100_000)

        cls.untouched = make_customer(cls.owner, "ه بی‌تراکنش", phone="09121110005")

    def setUp(self):
        self.client.force_login(self.owner)

    def body(self):
        return self.client.get(reverse("api:reminder_debtors")).json()

    def test_only_debtors_are_listed(self):
        """بستانکار، تسویه‌شده و بی‌تراکنش در فهرست نیستند — بدهی‌ای ندارند."""
        names = [row["fullname"] for row in self.body()["rows"]]
        self.assertEqual(names, ["ب بدهکارِ بزرگ", "الف بدهکار"])   # مرتب بر اساس مبلغ

    def test_amount_is_the_outstanding_balance(self):
        rows = {row["fullname"]: row for row in self.body()["rows"]}
        self.assertEqual(rows["الف بدهکار"]["amount"], 500_000)
        self.assertEqual(rows["ب بدهکارِ بزرگ"]["amount"], 2_000_000)

    def test_total_matches_the_rows(self):
        body = self.body()
        self.assertEqual(body["total"]["count"], 2)
        self.assertEqual(body["total"]["amount"], 2_500_000)

    def test_other_owners_ledger_is_invisible(self):
        """قرارداد: بدهکارِ مالکِ دیگر اینجا دیده نمی‌شود.

        وضعیت از تراکنش‌های همین مالک حساب می‌شود، نه از ستونِ کش‌شدهٔ
        `Customer.code` که بینِ همهٔ مالکانِ یک مشتری مشترک است.
        """
        stranger = make_owner()
        theirs = make_customer(stranger, "بدهکارِ غریبه", phone="09121110009")
        make_transaction(stranger, theirs, debt=5_000_000)

        names = [row["fullname"] for row in self.body()["rows"]]
        self.assertNotIn("بدهکارِ غریبه", names)

    def test_guest_gets_nothing(self):
        self.client.logout()
        response = self.client.get(reverse("api:reminder_debtors"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(SMS_DEV_MODE=True)
class ReminderSendTests(APITestCase):
    def setUp(self):
        self.owner = make_owner(business_name="سوپرمارکت رضا")
        self.debtor = make_customer(self.owner, "الف بدهکار", phone="09121110001")
        make_transaction(self.owner, self.debtor, debt=500_000)
        self.client.force_login(self.owner)

    def send(self, ids):
        return self.client.post(reverse("api:reminder_send"), {"customer_ids": ids}, format="json")

    def test_sending_logs_one_sms(self):
        response = self.send([self.debtor.id])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["sent"]), 1)

        log = SMSLog.objects.get(event=REMINDER_EVENT)
        self.assertEqual(log.to_phone, self.debtor.phone)
        self.assertEqual(log.body, f"[{settings.SMS_TEMPLATE_DEBT_REMINDER}] ارسال شد.")

    def test_amount_never_reaches_the_log(self):
        """قرارداد: مبلغ در `SMSLog` نمی‌نشیند — فقط نامِ الگو و رویداد."""
        self.send([self.debtor.id])
        log = SMSLog.objects.get(event=REMINDER_EVENT)
        self.assertNotIn("500", log.body)

    def test_second_send_is_blocked_by_the_cooldown(self):
        """پیامکِ تکراری هم پول است هم مشتری را می‌رنجاند."""
        self.send([self.debtor.id])
        body = self.send([self.debtor.id]).json()

        self.assertEqual(body["sent"], [])
        self.assertEqual(body["skipped"][0]["reason"], "cooldown")
        self.assertEqual(SMSLog.objects.filter(event=REMINDER_EVENT).count(), 1)

    def test_cooldown_expires(self):
        self.send([self.debtor.id])
        # `created` با auto_now_add ست می‌شود، پس برای عقب بردنش باید update کرد
        stale = timezone.now() - timezone.timedelta(hours=COOLDOWN_HOURS + 1)
        SMSLog.objects.filter(event=REMINDER_EVENT).update(created=stale)

        self.assertEqual(len(self.send([self.debtor.id]).json()["sent"]), 1)

    def test_customer_of_another_owner_is_skipped(self):
        """قرارداد: شناسه‌ای که بدهکارِ این مالک نیست پیامکی نمی‌گیرد."""
        stranger = make_owner()
        theirs = make_customer(stranger, "بدهکارِ غریبه", phone="09121110009")
        make_transaction(stranger, theirs, debt=5_000_000)

        body = self.send([theirs.id]).json()
        self.assertEqual(body["sent"], [])
        self.assertEqual(body["skipped"][0]["reason"], "not_debtor")
        self.assertFalse(SMSLog.objects.filter(to_phone=theirs.phone).exists())

    def test_non_debtor_is_skipped(self):
        creditor = make_customer(self.owner, "ج بستانکار", phone="09121110003")
        make_transaction(self.owner, creditor, paid=250_000)

        body = self.send([creditor.id]).json()
        self.assertEqual(body["skipped"][0]["reason"], "not_debtor")

    def test_empty_selection_is_rejected(self):
        self.assertEqual(self.send([]).status_code, status.HTTP_400_BAD_REQUEST)

    def test_owner_without_business_name_cannot_send(self):
        """متنِ پیامک بدونِ نامِ فرستنده ناقص است، پس اصلاً ارسالی انجام نمی‌شود."""
        self.owner.business_name = ""
        self.owner.save(update_fields=["business_name"])

        response = self.send([self.debtor.id])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(response.json()["needsBusinessName"])
        self.assertFalse(SMSLog.objects.filter(event=REMINDER_EVENT).exists())

    def test_guest_cannot_send(self):
        self.client.logout()
        self.assertEqual(self.send([self.debtor.id]).status_code, status.HTTP_403_FORBIDDEN)


class AmountFormatTests(APITestCase):
    def test_three_digit_separator_with_latin_digits(self):
        """ارقامِ فارسی عمداً فرستاده نمی‌شوند: توکنِ کاوه‌نگار رویشان سخت‌گیر است."""
        self.assertEqual(format_amount(2_500_000), "2,500,000")
        self.assertEqual(format_amount(0), "0")
