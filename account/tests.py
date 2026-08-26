"""احراز هویت — ثبت‌نام، ورود، کد یکبارمصرف و تغییرِ رمز.

⚠️ همهٔ تست‌ها با `SMS_DEV_MODE=True` اجرا می‌شوند: هیچ پیامکی واقعاً ارسال
نمی‌شود و فقط در `SMSLog` ثبت می‌گردد.
"""
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from account.models import SMSLog
from account.services import _delivery_target
from account.views import OTP_EXPIRY_SECONDS, OTP_MAX_ATTEMPTS

User = get_user_model()


@override_settings(SMS_DEV_MODE=True)
class RegisterLoginTests(APITestCase):
    def test_register_creates_an_owner_and_logs_them_in(self):
        """آدرس در ثبت‌نام گرفته نمی‌شود؛ جایش صفحهٔ پروفایل است."""
        response = self.client.post(reverse("api:register"), {
            "fullname": "کاربر تازه", "phone": "09121234567", "password": "test1234",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(phone="09121234567").exists())

        me = self.client.get(reverse("api:me")).json()
        self.assertEqual(me["phone"], "09121234567")

    def test_register_normalises_persian_digits_and_country_code(self):
        self.client.post(reverse("api:register"), {
            "fullname": "کاربر فارسی", "phone": "+۹۸۹۱۲۱۱۱۲۲۳۳", "password": "test1234",
        }, format="json")
        self.assertTrue(User.objects.filter(phone="09121112233").exists())

    def test_duplicate_phone_is_rejected(self):
        User.objects.create_user(fullname="اولی", phone="09121234567", password="test1234")
        response = self.client.post(reverse("api:register"), {
            "fullname": "دومی", "phone": "09121234567", "password": "test1234",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_login_logout_and_me(self):
        User.objects.create_user(fullname="کاربر", phone="09121234567", password="test1234")

        # مهمان ۲۰۰ با بدنهٔ خالی می‌گیرد، نه ۴۰۱: «لاگین نیستی» خطا نیست،
        # جوابِ درستِ همین سؤال است و فرانت نباید آن را در کنسول خطا ببیند
        anonymous = self.client.get(reverse("api:me"))
        self.assertEqual(anonymous.status_code, status.HTTP_200_OK)
        self.assertFalse(anonymous.content)

        response = self.client.post(reverse("api:login"),
                                    {"username": "09121234567", "password": "test1234"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse("api:me")).json()["fullname"], "کاربر")

        self.client.post(reverse("api:logout"))
        self.assertFalse(self.client.get(reverse("api:me")).content)

    def test_login_separates_unknown_user_from_wrong_password(self):
        User.objects.create_user(fullname="کاربر", phone="09121234567", password="test1234")

        unknown = self.client.post(reverse("api:login"),
                                   {"username": "09129999999", "password": "x"}, format="json")
        self.assertIn("username", unknown.json()["fieldErrors"])

        wrong = self.client.post(reverse("api:login"),
                                 {"username": "09121234567", "password": "wrong"}, format="json")
        self.assertIn("password", wrong.json()["fieldErrors"])

    def test_inactive_account_is_told_apart(self):
        User.objects.create_user(fullname="غیرفعال", phone="09121234567",
                                 password="test1234", is_active=False)
        response = self.client.post(reverse("api:login"),
                                    {"username": "09121234567", "password": "test1234"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_short_password_of_an_existing_user_still_logs_in(self):
        """رمزِ کاربرانِ قدیمی ۳ کاراکتر است؛ حداقلِ طول فقط جای *ساختن* رمز است."""
        User.objects.create_user(fullname="قدیمی", phone="09121234567", password="abc")
        response = self.client.post(reverse("api:login"),
                                    {"username": "09121234567", "password": "abc"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


@override_settings(SMS_DEV_MODE=True)
class OtpTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            fullname="کاربر", phone="09121234567", password="test1234",
        )

    def request_code(self):
        return self.client.post(reverse("api:otp_phone"), {"otpPhone": "09121234567"}, format="json")

    def confirm(self, code):
        return self.client.post(reverse("api:otp_confirm"),
                                {"otpPhone": "09121234567", "otpConfirm": code}, format="json")

    def test_requesting_a_code_stores_it_and_logs_the_send(self):
        self.assertEqual(self.request_code().status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(len(str(self.user.otp)), 5)
        self.assertTrue(SMSLog.objects.exists())

    def test_the_code_itself_is_never_written_to_the_log(self):
        """این جدول از پنل ادمین خواندنی است و نباید به کلیدِ ورود تبدیل شود."""
        self.request_code()
        self.user.refresh_from_db()
        for log in SMSLog.objects.all():
            self.assertNotIn(str(self.user.otp), log.body)

    def test_correct_code_logs_the_user_in_and_burns_the_code(self):
        self.request_code()
        self.user.refresh_from_db()
        response = self.confirm(str(self.user.otp))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse("api:me")).json()["phone"], "09121234567")

        self.user.refresh_from_db()
        self.assertFalse(self.user.otp)

    def test_persian_digits_in_the_code_are_accepted(self):
        self.request_code()
        self.user.refresh_from_db()
        persian = str(self.user.otp).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))
        self.assertEqual(self.confirm(persian).status_code, status.HTTP_200_OK)

    def test_expired_code_is_refused(self):
        self.request_code()
        self.user.refresh_from_db()
        code = str(self.user.otp)
        self.user.otp_time = timezone.now() - timezone.timedelta(seconds=OTP_EXPIRY_SECONDS + 5)
        self.user.save(update_fields=["otp_time"])
        self.assertEqual(self.confirm(code).status_code, status.HTTP_400_BAD_REQUEST)

    def test_attempts_are_counted_on_the_server_and_run_out(self):
        """شمارش در cache است نه کوکی، تا با پاک کردنِ کوکی دور نخورد."""
        self.request_code()
        for _ in range(OTP_MAX_ATTEMPTS):
            self.assertEqual(self.confirm("00000").status_code, status.HTTP_401_UNAUTHORIZED)

        blocked = self.confirm("00000")
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

        self.user.refresh_from_db()
        self.assertFalse(self.user.otp)

    def test_asking_again_while_a_code_is_alive_is_throttled(self):
        self.request_code()
        second = self.request_code()
        self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("remainingSeconds", second.json())

    def test_unknown_phone_is_404(self):
        response = self.client.post(reverse("api:otp_phone"),
                                    {"otpPhone": "09129999999"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


@override_settings(SMS_DEV_MODE=True)
class PasswordTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            fullname="کاربر", phone="09121234567", password="oldpass",
        )

    def test_change_password_keeps_the_session_alive(self):
        """بدون update_session_auth_hash کاربر بلافاصله از سشنِ خودش بیرون می‌افتد."""
        self.client.force_login(self.user)
        response = self.client.post(reverse("api:change_password"),
                                    {"old_password": "oldpass", "new_password": "newpass"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.client.get(reverse("api:me")).content)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpass"))

    def test_change_password_rejects_a_wrong_current_password(self):
        self.client.force_login(self.user)
        response = self.client.post(reverse("api:change_password"),
                                    {"old_password": "wrong", "new_password": "newpass"},
                                    format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("oldpass"))

    def test_change_password_requires_login(self):
        response = self.client.post(reverse("api:change_password"),
                                    {"old_password": "oldpass", "new_password": "newpass"},
                                    format="json")
        self.assertIn(response.status_code,
                      (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_forget_password_replaces_the_password_and_logs_the_send(self):
        response = self.client.post(reverse("api:forget_password"),
                                    {"otpPhone": "09121234567"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("oldpass"))
        self.assertTrue(SMSLog.objects.exists())

    def test_forget_password_never_logs_the_new_password(self):
        """قرارداد: بدنهٔ لاگ فقط نامِ الگو و رویداد است، هیچ‌چیزِ دیگری.

        بررسیِ «کلمهٔ password در متن نیست» کافی نبود — نامِ خودِ الگو
        (`crm-forget-password`) همان کلمه را دارد. پس بدنه را دقیق می‌سنجیم.
        """
        self.client.post(reverse("api:forget_password"), {"otpPhone": "09121234567"}, format="json")
        logs = list(SMSLog.objects.all())
        self.assertTrue(logs)
        for log in logs:
            self.assertEqual(log.body, "[crm-forget-password] ارسال شد.")


@override_settings(SMS_DEV_MODE=True)
class ProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            fullname="کاربر", phone="09121234567", password="test1234", address="تهران",
        )
        self.client.force_login(self.user)
        self.url = reverse("api:profile")

    def test_updating_name_and_address(self):
        response = self.client.patch(self.url,
                                     {"fullname": "نامِ تازه", "address": "شیراز"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["userData"]["fullname"], "نامِ تازه")

        self.user.refresh_from_db()
        self.assertEqual(self.user.address, "شیراز")

    def test_address_may_be_cleared(self):
        response = self.client.patch(self.url, {"address": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.address, "")

    def test_short_name_is_rejected(self):
        response = self.client.patch(self.url, {"fullname": "ال"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.fullname, "کاربر")

    def test_phone_cannot_be_changed_from_the_profile(self):
        """شماره همان نامِ کاربریِ ورود است و در سریالایزرِ ویرایش نیست."""
        self.client.patch(self.url, {"phone": "09129999999"}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone, "09121234567")

    def test_role_cannot_be_escalated_from_the_profile(self):
        self.client.patch(self.url, {"role": "superuser"}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, "owner")

    def test_profile_requires_login(self):
        self.client.logout()
        response = self.client.patch(self.url, {"fullname": "مهمان"}, format="json")
        self.assertIn(response.status_code,
                      (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_one_user_cannot_edit_another(self):
        """endpoint اصلاً شناسه نمی‌گیرد — همیشه روی request.user کار می‌کند."""
        other = User.objects.create_user(
            fullname="دیگری", phone="09121112233", password="test1234",
        )
        self.client.patch(self.url, {"fullname": "دستکاری شده"}, format="json")
        other.refresh_from_db()
        self.assertEqual(other.fullname, "دیگری")


@override_settings(SMS_DEV_MODE=True)
class BusinessNameTests(APITestCase):
    """نامِ کسب‌وکار — در ثبت‌نام نیست و از پروفایل ذخیره می‌شود."""

    def setUp(self):
        self.user = User.objects.create_user(
            fullname="کاربر", phone="09121234567", password="test1234",
        )
        self.client.force_login(self.user)

    def test_a_new_owner_starts_without_one(self):
        self.assertEqual(self.user.business_name, "")

    def test_it_is_saved_from_the_profile_endpoint(self):
        response = self.client.patch(reverse("api:profile"),
                                     {"business_name": "سوپرمارکت رضا"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["userData"]["business_name"], "سوپرمارکت رضا")

        self.user.refresh_from_db()
        self.assertEqual(self.user.business_name, "سوپرمارکت رضا")

    def test_it_is_capped_at_forty_characters(self):
        """سقف از خودِ پیامک می‌آید: نامِ بلندتر پیامک را چندبخشی می‌کند."""
        response = self.client.patch(reverse("api:profile"),
                                     {"business_name": "ب" * 41}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_it_may_be_cleared(self):
        self.user.business_name = "سوپرمارکت رضا"
        self.user.save(update_fields=["business_name"])
        self.client.patch(reverse("api:profile"), {"business_name": ""}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.business_name, "")

    def test_it_reaches_the_client_through_me(self):
        """فرانت از همین‌جا می‌فهمد باید مودالِ گرفتنِ نام را باز کند یا نه."""
        self.assertIn("business_name", self.client.get(reverse("api:me")).json())


class SmsDeliveryTargetTests(APITestCase):
    """بازهدایتِ گیرندهٔ پیامک در محیطِ آزمایش.

    کاوه‌نگار فقط به شماره‌های تاییدشدهٔ صاحب حساب ارسال دارد و شماره‌های دفترِ
    آزمایشی ساختگی‌اند، پس همه‌چیز به یک شمارهٔ واقعی هدایت می‌شود.
    """

    @override_settings(SMS_TEST_RECIPIENT="")
    def test_without_an_override_the_real_number_is_used(self):
        self.assertEqual(_delivery_target("09121234567"), "09121234567")

    @override_settings(SMS_TEST_RECIPIENT="09177969417")
    def test_with_an_override_every_message_goes_to_that_number(self):
        self.assertEqual(_delivery_target("09121234567"), "09177969417")
        self.assertEqual(_delivery_target("09129999999"), "09177969417")

    @override_settings(SMS_TEST_RECIPIENT="  09177969417  ")
    def test_the_override_is_trimmed(self):
        self.assertEqual(_delivery_target("09121234567"), "09177969417")

    @override_settings(SMS_DEV_MODE=True, SMS_TEST_RECIPIENT="09177969417")
    def test_the_log_keeps_the_real_recipient_not_the_override(self):
        """وگرنه لاگ می‌گفت همهٔ پیامک‌ها برای یک نفر بوده."""
        user = User.objects.create_user(
            fullname="کاربر", phone="09121234567", password="test1234",
        )
        self.client.post(reverse("api:otp_phone"), {"otpPhone": user.phone}, format="json")
        self.assertTrue(SMSLog.objects.filter(to_phone="09121234567").exists())

    @override_settings(SMS_DEV_MODE=True)
    def test_an_unknown_phone_never_reaches_the_sender(self):
        """بازهدایت جای بررسیِ «این شماره در سیستم هست؟» را نمی‌گیرد."""
        response = self.client.post(reverse("api:otp_phone"),
                                    {"otpPhone": "09129999999"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(SMSLog.objects.exists())

    @override_settings(SMS_DEV_MODE=True)
    def test_forget_password_also_checks_the_phone_first(self):
        response = self.client.post(reverse("api:forget_password"),
                                    {"otpPhone": "09129999999"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(SMSLog.objects.exists())
